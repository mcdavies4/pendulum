import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db } from './src/server_db';
import { QRCodeRecord, ScanLog, LeadRecord } from './src/types';
import Stripe from 'stripe';

// Simple direct country map
const countryNames: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  CA: 'Canada',
  FR: 'France',
  JP: 'Japan',
  AU: 'Australia',
  IN: 'India',
  BR: 'Brazil',
  ZA: 'South Africa',
  NG: 'Nigeria',
  ES: 'Spain',
  MX: 'Mexico',
  IT: 'Italy',
  NL: 'Netherlands',
  CH: 'Switzerland',
  SG: 'Singapore',
  IE: 'Ireland',
  SE: 'Sweden',
};

const defaultCountries = [
  { code: 'US', name: 'United States', region: 'California', city: 'San Francisco' },
  { code: 'GB', name: 'United Kingdom', region: 'London', city: 'London' },
  { code: 'DE', name: 'Germany', region: 'Berlin', city: 'Berlin' },
  { code: 'FR', name: 'France', region: 'Île-de-France', city: 'Paris' },
  { code: 'CA', name: 'Canada', region: 'Ontario', city: 'Toronto' },
  { code: 'JP', name: 'Japan', region: 'Tokyo', city: 'Tokyo' },
  { code: 'AU', name: 'Australia', region: 'New South Wales', city: 'Sydney' },
];

function parseUserAgent(uaString: string) {
  const ua = uaString || '';
  let device: 'Mobile' | 'Desktop' | 'Tablet' = 'Desktop';
  let browser: 'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Other' = 'Other';
  let os: 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Other' = 'Other';

  // Device & OS detection
  if (/ipad/i.test(ua)) {
    device = 'Tablet';
    os = 'iOS';
  } else if (/iphone|ipod/i.test(ua)) {
    device = 'Mobile';
    os = 'iOS';
  } else if (/android/i.test(ua)) {
    if (/mobile/i.test(ua)) {
      device = 'Mobile';
    } else {
      device = 'Tablet';
    }
    os = 'Android';
  }

  if (os === 'Other') {
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';
  }

  // Browser detection
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';

  return { device, browser, os };
}

let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('Stripe secret API key is missing. Specify STRIPE_SECRET_KEY in configurations.');
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export const app = express();
app.use(express.json());

// Root redirect for naked /r paths
app.get('/r', (req: Request, res: Response) => {
  res.redirect('/');
});

  // 1. Dynamic Redirect Route - /r/:id
  app.get('/r/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const qr = db.getQRCodeById(id);

    if (!qr) {
      // If QR doesn't exist, redirect to main landing with a message
      return res.redirect(`/?error=qr_not_found&code=${encodeURIComponent(id)}`);
    }

    // Determine location headers from GCLB / App Engine / Cloud Run if available
    const geoCountry = (req.headers['x-client-geo-country'] || req.headers['cf-ipcountry'] || req.headers['x-appengine-country']) as string | undefined;
    const geoRegion = req.headers['x-client-geo-region'] as string | undefined;
    const geoCity = req.headers['x-client-geo-city'] as string | undefined;

    let countryCode = geoCountry ? geoCountry.toUpperCase() : '';
    let countryName = countryNames[countryCode] || countryCode || '';
    let region = geoRegion || '';
    let city = geoCity || '';

    // If local/development/empty, mock realistic location details
    if (!countryCode || countryCode === 'UNKNOWN') {
      const randomPlace = defaultCountries[Math.floor(Math.random() * defaultCountries.length)];
      countryCode = randomPlace.code;
      countryName = randomPlace.name;
      region = randomPlace.region;
      city = randomPlace.city;
    }

    // Parse UA
    const userAgentStr = req.headers['user-agent'] || '';
    const { device, browser, os } = parseUserAgent(userAgentStr);

    // Parse referrer
    let referrer = (req.headers['referer'] || '').trim();
    if (!referrer) {
      referrer = 'Direct Scan / Input';
    } else {
      try {
        const parsedUrl = new URL(referrer);
        // clean domain name
        referrer = parsedUrl.hostname.replace('www.', '');
      } catch (e) {
        referrer = 'Direct Scan / Input';
      }
    }

    // Capture Scan
    const scanLog: ScanLog = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      qrId: qr.id,
      timestamp: new Date().toISOString(),
      ip: (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim(),
      country: countryCode,
      countryName,
      region,
      city,
      device,
      browser,
      os,
      referrer,
    };

    db.addScan(scanLog);

    // If Lead Capture is enabled, and we don't have a lead yet (we can handle target-routing)
    if (qr.leadCaptureEnabled) {
      // Redirect to the custom local lead capture page, passing the final destination
      return res.redirect(`/lead/${qr.id}?dest=${encodeURIComponent(qr.longUrl)}`);
    }

    // Standard fast 302 redirect
    res.redirect(qr.longUrl);
  });

  // 2. Lead capture post webhook
  app.post('/api/qr/:id/lead', (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body; // e.g. { name, email, phone, notes }

    const qr = db.getQRCodeById(id);
    if (!qr) {
      return res.status(404).json({ error: 'QR Code not found' });
    }

    const lead: LeadRecord = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      qrId: qr.id,
      timestamp: new Date().toISOString(),
      data,
    };

    db.addLead(lead);
    res.status(201).json({ success: true, lead });
  });

  // Stripe Integration Endpoints
  app.post('/api/stripe/create-checkout-session', async (req: Request, res: Response) => {
    try {
      const stripe = getStripe();
      
      let baseUrl = process.env.APP_URL || '';
      if (!baseUrl) {
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        baseUrl = `${protocol}://${req.headers.host}`;
      }
      baseUrl = baseUrl.replace(/\/$/, '');

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Pendulum QR Premium (Subscription)',
                description: 'Unlock unlimited dynamic redirect QR loops, advanced metric telemetry & custom branded verticals.',
              },
              unit_amount: 2900, // $29.00 USD
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${baseUrl}/?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?stripe_status=cancel`,
      });

      res.status(200).json({ url: session.url });
    } catch (err: any) {
      console.error('Stripe Session Generation Error:', err);
      res.status(500).json({ error: err.message || 'Failed to initialize checkout gateway session.' });
    }
  });

  app.get('/api/stripe/verify-session', async (req: Request, res: Response) => {
    const sessionId = req.query.session_id as string;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID parameter is required.' });
    }

    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid' || session.status === 'complete') {
        const subscriptionId = session.subscription as string || session.id;
        
        // Link authenticated user to paid status in the database persistence
        const userId = req.headers['x-visitor-id'] as string;
        if (userId && userId.startsWith('user_')) {
          db.updateUser(userId, { isPaid: true, stripeSubscriptionId: subscriptionId });
        }

        return res.status(200).json({
          success: true,
          subscriptionId,
        });
      } else {
        return res.status(200).json({
          success: false,
          error: `Stripe session current payment status is: ${session.payment_status}`,
        });
      }
    } catch (err: any) {
      console.error('Stripe Verification Error:', err);
      res.status(500).json({ error: err.message || 'Failed to verify payment identity with Stripe.' });
    }
  });

  // =========================================================================
  // USER AUTHENTICATION ENDPOINTS
  // =========================================================================

  // Helper helper to hash passwords securely
  const hashPassword = (password: string) => {
    return crypto.createHash('sha256').update(password).digest('hex');
  };

  // Register Endpoint
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { email, password, visitorId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required fields.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || password.length < 6) {
      return res.status(400).json({ error: 'Please enter a valid email address and a password with at least 6 characters.' });
    }

    const existingUser = db.getUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please choose another or login.' });
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isProFounder = cleanEmail.toLowerCase() === 'support@odogwu.online'; // Provide immediate Pro and admin capability for creator email!

    const userRecord = {
      id: userId,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      isPaid: isProFounder ? true : false,
      createdAt: new Date().toISOString(),
    };

    db.createUser(userRecord);

    // If they have sandbox QR codes generated in guest/visitor mode, migrate them!
    if (visitorId && visitorId.trim()) {
      db.migrateVisitorQRCodes(visitorId, userId);
    }

    res.status(201).json({
      success: true,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        isPaid: userRecord.isPaid,
      }
    });
  });

  // Login Endpoint
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password, visitorId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required fields.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.getUserByEmail(cleanEmail);

    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Incorrect email address or password. Please try again.' });
    }

    // Support transferring guest links to authenticated user account!
    if (visitorId && visitorId.trim()) {
      db.migrateVisitorQRCodes(visitorId, user.id);
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isPaid: user.isPaid,
      }
    });
  });

  // Get current session endpoint
  app.get('/api/auth/me', (req: Request, res: Response) => {
    // Look at request header
    const userId = req.headers['x-visitor-id'] as string;
    if (!userId || !userId.startsWith('user_')) {
      return res.status(200).json({ loggedIn: false });
    }

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(200).json({ loggedIn: false });
    }

    res.status(200).json({
      loggedIn: true,
      user: {
        id: user.id,
        email: user.email,
        isPaid: user.isPaid,
      }
    });
  });

  // Logout Endpoint
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    res.status(200).json({ success: true });
  });

  // Admin route to monitor platform user signups
  app.get('/api/admin/users', (req: Request, res: Response) => {
    const userId = req.headers['x-visitor-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized credentials.' });
    }
    const requestingUser = db.getUserById(userId);
    if (!requestingUser || requestingUser.email.toLowerCase() !== 'support@odogwu.online') {
      return res.status(403).json({ error: 'Access forbidden. Only system administrators can fetch users.' });
    }

    const allUsers = db.getAllUsers().map(u => ({
      id: u.id,
      email: u.email,
      isPaid: u.isPaid,
      stripeSubscriptionId: u.stripeSubscriptionId,
      createdAt: u.createdAt
    }));

    res.status(200).json({ success: true, users: allUsers });
  });

  // 3. API - List QR codes
  app.get('/api/qrcodes', (req: Request, res: Response) => {
    const ownerId = (req.headers['x-visitor-id'] as string) || 'default_user';
    const qrList = db.getQRCodes(ownerId);
    res.status(200).json(qrList);
  });

  // 3.5 API - Get Single QR code publicly (e.g. for Lead Capture layouts across devices)
  app.get('/api/qrcodes/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const qr = db.getQRCodeById(id);
    if (!qr) {
      return res.status(404).json({ error: 'QR Code not found' });
    }
    res.status(200).json(qr);
  });

  // 4. API - Create QR code
  app.post('/api/qrcodes', (req: Request, res: Response) => {
    const ownerId = (req.headers['x-visitor-id'] as string) || 'default_user';
    const { name, longUrl, qrType, vertical, leadCaptureEnabled, leadFields } = req.body;

    if (!name || !longUrl) {
      return res.status(400).json({ error: 'Name and Target URL are required' });
    }

    // Securely enforce free plan limits: Free users are capped at 2 campaigns
    let isUserPaid = false;
    if (ownerId && ownerId.startsWith('user_')) {
      const user = db.getUserById(ownerId);
      if (user && (user.isPaid || user.email.toLowerCase() === 'support@odogwu.online')) {
        isUserPaid = true;
      }
    }

    if (!isUserPaid) {
      const existingQRs = db.getQRCodes(ownerId);
      if (existingQRs.length >= 2) {
        return res.status(403).json({ 
          error: 'Campaign limit reached. Unlock Premium to bypass standard free tier restrictions (Max 2 codes).' 
        });
      }
    }

    let id = req.body.id || Math.random().toString(36).substring(2, 7);
    id = id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');

    if (db.getQRCodeById(id)) {
      return res.status(400).json({ error: `QR Short Code "${id}" already exists` });
    }

    const qr: QRCodeRecord = {
      id,
      name,
      longUrl,
      qrType: qrType || 'dynamic',
      createdAt: new Date().toISOString(),
      ownerId,
      scanCount: 0,
      vertical: vertical || 'general',
      leadCaptureEnabled: !!leadCaptureEnabled,
      leadFields: leadFields || ['name', 'email', 'phone'],
    };

    db.createQRCode(qr);
    res.status(201).json(qr);
  });

  // 5. API - Update QR code
  app.put('/api/qrcodes/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, longUrl, vertical, leadCaptureEnabled, leadFields } = req.body;
    const ownerId = (req.headers['x-visitor-id'] as string) || 'default_user';

    const existing = db.getQRCodeById(id);
    if (!existing) {
      return res.status(404).json({ error: 'QR Code not found' });
    }

    if (existing.ownerId !== ownerId) {
      return res.status(403).json({ error: 'Access forbidden. You do not own this QR code.' });
    }

    const updated = db.updateQRCode(id, {
      name: name !== undefined ? name : existing.name,
      longUrl: longUrl !== undefined ? longUrl : existing.longUrl,
      vertical: vertical !== undefined ? vertical : existing.vertical,
      leadCaptureEnabled: leadCaptureEnabled !== undefined ? !!leadCaptureEnabled : existing.leadCaptureEnabled,
      leadFields: leadFields !== undefined ? leadFields : existing.leadFields,
    });

    res.status(200).json(updated);
  });

  // 6. API - Delete QR code
  app.delete('/api/qrcodes/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const ownerId = (req.headers['x-visitor-id'] as string) || 'default_user';

    const existing = db.getQRCodeById(id);
    if (!existing) {
      return res.status(404).json({ error: 'QR Code not found' });
    }

    if (existing.ownerId !== ownerId) {
      return res.status(403).json({ error: 'Access forbidden. You do not own this QR code.' });
    }

    db.deleteQRCode(id);
    res.status(200).json({ success: true, message: 'QR Code deleted' });
  });

  // 7. API - Aggregate Analytics
  app.get('/api/analytics', (req: Request, res: Response) => {
    const ownerId = (req.headers['x-visitor-id'] as string) || 'default_user';
    const qrList = db.getQRCodes(ownerId);
    const qrIds = qrList.map(qr => qr.id);
    const scansList = db.getScans(qrIds);

    res.status(200).json({
      qrcodesCount: qrList.length,
      scansCount: scansList.length,
      scans: scansList, // returns all logs for full analytics on client (charts, tables, maps)
    });
  });

  // 8. API - Scans and Leads lists
  app.get('/api/leads', (req: Request, res: Response) => {
    const ownerId = (req.headers['x-visitor-id'] as string) || 'default_user';
    const qrList = db.getQRCodes(ownerId);
    const qrIds = qrList.map(qr => qr.id);
    const leadsList = db.getLeads(qrIds);
    res.status(200).json(leadsList);
  });

  // 9. API - Simulation Route (Creates fake scans dynamically on request to demonstrate charts in real-time!)
  app.post('/api/simulate-scan/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const qr = db.getQRCodeById(id);
    if (!qr) return res.status(404).json({ error: 'QR Code not found' });

    // Mock realistic user details
    const referrers = ['Instagram Ad', 'Facebook Link', 'Street Flyer Scan', 'Table Tent Card', 'Google Search', 'Direct scan'];
    const devices: ('Mobile' | 'Desktop' | 'Tablet')[] = ['Mobile', 'Mobile', 'Tablet', 'Desktop'];
    const browsers: ('Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Other')[] = ['Chrome', 'Safari', 'Safari', 'Firefox', 'Edge'];
    const ossByDevice = {
      Mobile: ['iOS', 'Android'],
      Tablet: ['iOS', 'Android'],
      Desktop: ['macOS', 'Windows', 'Linux'],
    };

    const referrer = referrers[Math.floor(Math.random() * referrers.length)];
    const device = devices[Math.floor(Math.random() * devices.length)];
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const osOptions = ossByDevice[device];
    const os = osOptions[Math.floor(Math.random() * osOptions.length)] as any;

    const randomPlace = defaultCountries[Math.floor(Math.random() * defaultCountries.length)];

    const scanLog: ScanLog = {
      id: `scan_simulated_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      qrId: qr.id,
      timestamp: new Date().toISOString(),
      ip: `192.168.2.${Math.floor(Math.random() * 255)}`,
      country: randomPlace.code,
      countryName: randomPlace.name,
      region: randomPlace.region,
      city: randomPlace.city,
      device,
      browser,
      os,
      referrer,
    };

    db.addScan(scanLog);
    res.status(201).json({ success: true, scan: scanLog });
  });

  // 9.5 AI Campaign Marketing Advisor using gemini-3.5-flash
  app.post('/api/ai/optimize-campaign', async (req: Request, res: Response) => {
    const { name, longUrl, vertical } = req.body;
    try {
      if (!vertical) {
        return res.status(400).json({ error: 'Vertical category parameter is required.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback simulated AI suggestions if API key is not configured yet
        return res.status(200).json({
          success: true,
          suggestions: {
            optimizedHeadline: `${name || 'Special Campaign'} • High Engagement`,
            ctaText: `Scan to explore our ${vertical.replace('_', ' ')} link:`,
            marketingTips: [
              "Print the QR code with a contrast factor above 80% to ensure zero scanning failures.",
              "Place structural CTAs directly below the matrix code grid to educate first-time viewers.",
              "Anchor your flyer at standard eye-level (1.5 meters) in high foot-traffic zone corridors."
            ],
            suggestedSlugs: [`${vertical}-${name ? name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'promo'}`]
          },
          simulated: true
        });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are an elite marketing strategist specializing in offline-to-online conversion and QR code campaigns.
The user is building a dynamic QR Code tracking campaign on Pendulum with:
- Campaign Name: "${name || 'Untitled'}"
- Product/Market Vertical: "${vertical}"
- Target URL: "${longUrl || 'Not specified'}"

Please generate high-converting Campaign Optimization copy. Provide the output in a JSON response with these properties:
1. "optimizedHeadline": A catchy, high-conversion headline (max 45 characters).
2. "ctaText": A compelling call-to-action to print next to or under the QR code (max 40 characters, e.g. "Scan to view our fresh digital menu!").
3. "marketingTips": An array of exactly 3 practical, high-value professional suggestions to maximize conversions, physical scan rates, or analytics tracking for this specific vertical.
4. "suggestedSlugs": An array of 2 short URL-slug ideas (e.g. ['summer-menu', 'deals-50']) suited for this campaign.

Return JSON only conforming to the schema of these 4 specific keys: "optimizedHeadline", "ctaText", "marketingTips", "suggestedSlugs".`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '{}';
      const suggestions = JSON.parse(responseText.trim().replace(/^```json/, '').replace(/```$/, ''));

      res.status(200).json({
        success: true,
        suggestions,
        simulated: false
      });
    } catch (err: any) {
      console.error('Gemini Optimization Failure:', err);
      res.status(200).json({
        success: true,
        suggestions: {
          optimizedHeadline: `${name || 'Special Campaign'} • High Engagement`,
          ctaText: `Scan to explore our ${vertical.replace('_', ' ')} link:`,
          marketingTips: [
            "Print the QR code with a contrast factor above 80% to ensure zero scanning failures.",
            "Place structural CTAs directly below the matrix code grid to educate first-time viewers.",
            "Anchor your flyer at standard eye-level (1.5 meters) in high foot-traffic zone corridors."
          ],
          suggestedSlugs: [`${vertical}-${name ? name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'promo'}`]
        },
        simulated: true,
        error: err.message
      });
    }
  });

  // 10. Vite Configuration or Static Delivery
  async function initializeServer() {
    if (process.env.VERCEL) return;

    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);

      // Fallback for SPA routing in development so refreshing any sub-path (like /lead/:id) works flawlessly!
      app.get('*', async (req: Request, res: Response, next) => {
        // Skip API and redirect routes which are handled above
        if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/r/')) {
          return next();
        }
        try {
          const url = req.originalUrl;
          const indexHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
          const transformedHtml = await vite.transformIndexHtml(url, indexHtml);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(transformedHtml);
        } catch (e) {
          next(e);
        }
      });
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Pendulum Backend] Express running on port :${PORT}`);
    });
  }

  initializeServer().catch((error) => {
    console.error('Critical server load exception:', error);
  });

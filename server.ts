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

    // Enforce multi-tier redirection limits of scans per campaign
    let ownerTier: 'free' | 'starter' | 'plus' = 'free';
    if (qr.ownerId) {
      if (qr.ownerId.startsWith('user_')) {
        const owner = db.getUserById(qr.ownerId);
        if (owner) {
          if (owner.email.toLowerCase() === 'support@odogwu.online' || owner.email.toLowerCase() === 'azubuikedavies@gmail.com') {
            ownerTier = 'plus';
          } else {
            ownerTier = owner.subscriptionTier || (owner.isPaid ? 'plus' : 'free');
          }
        }
      } else {
        // Exempt default_user/demo or anonymous seeds so that initial workspace dashboard looks amazing
        ownerTier = 'plus';
      }
    } else {
      ownerTier = 'plus';
    }

    let isLimitReached = false;
    let limitMessage = '';
    let maxScans = 30;
    let upgradeNotice = '';

    if (ownerTier === 'free') {
      maxScans = 30;
      if ((qr.scanCount || 0) >= maxScans) {
        isLimitReached = true;
        limitMessage = `This dynamic QR campaign operates on a standard Free Trial account and has reached its redirection cap of 30 scans.`;
        upgradeNotice = `To resume instant redirects for your scanners, remove limitations, and enjoy custom QR designs, upgrade to Pro Starter or Pro Plus.`;
      }
    } else if (ownerTier === 'starter') {
      maxScans = 150;
      if ((qr.scanCount || 0) >= maxScans) {
        isLimitReached = true;
        limitMessage = `This dynamic QR campaign operates on a Pro Starter account and has reached its campaign redirection cap of 150 scans.`;
        upgradeNotice = `To unlock unlimited scale, unlimited redirections for all physical assets, and priority support, upgrade to Pro Plus.`;
      }
    }

    if (isLimitReached) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Campaign Redirect Paused | Pendulum QR</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              background-color: #09090b;
              color: #fafafa;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .card {
              background: #18181b;
              border: 1px solid #27272a;
              border-radius: 12px;
              padding: 40px;
              max-width: 480px;
              width: 100%;
              text-align: center;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
            }
            .logo {
              font-weight: 700;
              font-size: 24px;
              letter-spacing: -0.05em;
              color: #ffffff;
              display: inline-flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 24px;
              justify-content: center;
            }
            .logo span {
              color: #10b981;
            }
            h1 {
              font-size: 20px;
              font-weight: 600;
              margin-top: 0;
              margin-bottom: 12px;
              color: #f4f4f5;
            }
            p {
              color: #a1a1aa;
              font-size: 15px;
              line-height: 1.6;
              margin-bottom: 24px;
            }
            .badge {
              display: inline-block;
              background-color: #ef4444;
              color: #f4f4f5;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.05em;
              text-transform: uppercase;
              margin-bottom: 16px;
            }
            .btn {
              display: inline-block;
              background-color: #4f46e5;
              color: #ffffff;
              text-decoration: none;
              font-weight: 600;
              font-size: 14px;
              padding: 12px 24px;
              border-radius: 8px;
              transition: background-color 0.2s;
            }
            .btn:hover {
              background-color: #4338ca;
            }
            .footer {
              margin-top: 32px;
              font-size: 12px;
              color: #52525b;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">Pendulum<span>QR</span></div>
            <div class="badge">Scan cap reached</div>
            <h1>Campaign Redirect Paused</h1>
            <p>${limitMessage}</p>
            <p style="font-size: 14px; color: #71717a;">${upgradeNotice}</p>
            <a href="/" class="btn">Upgrade Member Portal</a>
            <div class="footer">Powered by Pendulum QR &bull; Instant Mobile Redirection</div>
          </div>
        </body>
        </html>
      `);
    }

    db.addScan(scanLog);

    // If Lead Capture is enabled, and we don't have a lead yet (we can handle target-routing)
    if (qr.leadCaptureEnabled) {
      // Redirect to the custom local lead capture page, passing the final destination
      let destUrl = qr.longUrl.trim();
      if (!/^https?:\/\//i.test(destUrl)) {
        destUrl = `https://${destUrl}`;
      }
      return res.redirect(`/lead/${qr.id}?dest=${encodeURIComponent(destUrl)}`);
    }

    // Standard fast 302 redirect
    let targetUrl = qr.longUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }
    res.redirect(targetUrl);
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
      const planId = req.query.planId as string || req.body.planId as string || 'plus';
      
      let baseUrl = process.env.APP_URL || '';
      if (!baseUrl) {
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        baseUrl = `${protocol}://${req.headers.host}`;
      }
      baseUrl = baseUrl.replace(/\/$/, '');

      let amount = 2900;
      let planName = 'Pendulum QR Pro Plus (Unlimited)';
      let planDesc = 'Unlock unlimited dynamic redirect QR loops, advanced metrics & unlimited campaign slots.';

      if (planId === 'starter') {
        amount = 1200;
        planName = 'Pendulum QR Pro Starter (Lite)';
        planDesc = 'Create up to 10 campaigns, use basic country redirects and standard analytics.';
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: planName,
                description: planDesc,
              },
              unit_amount: amount,
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${baseUrl}/?stripe_status=success&session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}`,
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
    const planId = req.query.plan_id as string || 'plus';
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
          db.updateUser(userId, { 
            isPaid: true, 
            stripeSubscriptionId: subscriptionId,
            subscriptionTier: planId as 'starter' | 'plus'
          });
        }

        return res.status(200).json({
          success: true,
          subscriptionId,
          planId
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
    const restoredHash = hashPassword('restored_on_reboot');
    if (existingUser) {
      if (existingUser.passwordHash === restoredHash) {
        // This was a silent server-restore placeholder. Upgrade it with their chosen password!
        const correctHash = hashPassword(password);
        db.updateUser(existingUser.id, { passwordHash: correctHash });
        
        if (visitorId && visitorId.trim()) {
          db.migrateVisitorQRCodes(visitorId, existingUser.id);
        }

        const tier = existingUser.subscriptionTier || (existingUser.isPaid ? 'plus' : 'free');

        return res.status(201).json({
          success: true,
          user: {
            id: existingUser.id,
            email: existingUser.email,
            isPaid: existingUser.isPaid,
            subscriptionTier: tier
          },
          backup: {
            id: existingUser.id,
            email: existingUser.email,
            passwordHash: correctHash,
            isPaid: existingUser.isPaid,
            subscriptionTier: tier,
            createdAt: existingUser.createdAt,
            twoFactorEnabled: !!existingUser.twoFactorEnabled
          }
        });
      }
      return res.status(400).json({ error: 'An account with this email address already exists. Please choose another or login.' });
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isProFounder = cleanEmail.toLowerCase() === 'support@odogwu.online' || cleanEmail.toLowerCase() === 'azubuikedavies@gmail.com'; // Provide immediate Pro and admin capability for creator emails!

    const userRecord = {
      id: userId,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      isPaid: isProFounder ? true : false,
      subscriptionTier: (isProFounder ? 'plus' : 'free') as 'free' | 'starter' | 'plus',
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
        subscriptionTier: userRecord.subscriptionTier
      },
      backup: {
        id: userRecord.id,
        email: userRecord.email,
        passwordHash: userRecord.passwordHash,
        isPaid: userRecord.isPaid,
        subscriptionTier: userRecord.subscriptionTier,
        createdAt: userRecord.createdAt,
        twoFactorEnabled: false
      }
    });
  });

  // Two-Factor Authentication Memory Storage
  const twoFactorCodes = new Map<string, { code: string; timestamp: number }>();

  // Login Endpoint
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password, visitorId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required fields.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.getUserByEmail(cleanEmail);
    const restoredHash = hashPassword('restored_on_reboot');

    if (!user) {
      return res.status(401).json({ error: 'Incorrect email address or password. Please try again.' });
    }

    if (user.passwordHash === restoredHash) {
      // The user session was created silently on reboot without their actual password context.
      // Claim this restored shell account by recording their newly provided password hash!
      const correctHash = hashPassword(password);
      db.updateUser(user.id, { passwordHash: correctHash });
      user.passwordHash = correctHash;
    } else if (user.passwordHash !== hashPassword(password)) {
      if (user.passwordHash === 'restored_on_reboot') {
        const correctHash = hashPassword(password);
        db.updateUser(user.id, { passwordHash: correctHash });
        user.passwordHash = correctHash;
      } else {
        return res.status(401).json({ error: 'Incorrect email address or password. Please try again.' });
      }
    }

    // Dynamic Multi-Factor Security (Double-Auth) flow
    if (user.twoFactorEnabled) {
      const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
      twoFactorCodes.set(cleanEmail, { code: pinCode, timestamp: Date.now() });
      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        email: cleanEmail,
        simulatedOtp: pinCode
      });
    }

    // Support transferring guest links to authenticated user account!
    if (visitorId && visitorId.trim()) {
      db.migrateVisitorQRCodes(visitorId, user.id);
    }

    const tier = user.subscriptionTier || (user.isPaid ? 'plus' : 'free');

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isPaid: user.isPaid,
        subscriptionTier: tier,
        twoFactorEnabled: !!user.twoFactorEnabled
      },
      backup: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        isPaid: user.isPaid,
        subscriptionTier: tier,
        createdAt: user.createdAt,
        twoFactorEnabled: !!user.twoFactorEnabled
      }
    });
  });

  // Password Reset In-Memory storage helper
  const resetCodes = new Map<string, { code: string; timestamp: number }>();

  // Forgot Password Endpoint
  app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ error: 'No account with this email address exists in our database.' });
    }

    // Generate a secure 6-digit numeric verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    resetCodes.set(cleanEmail, {
      code,
      timestamp: Date.now()
    });

    // In a sandbox environment, we return the simulated code in the response
    // so the client can show it explicitly for easy testing without an SMTP server.
    res.status(200).json({
      success: true,
      message: 'Password reset verification code simulated.',
      simulatedCode: code
    });
  });

  // Reset Password Endpoint (with verification code check)
  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required fields.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Please enter a secure password with at least 6 characters.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ error: 'No account matching this email address exists.' });
    }

    const record = resetCodes.get(cleanEmail);
    if (!record || record.code !== code.trim()) {
      return res.status(400).json({ error: 'The reset code provided is invalid or has expired.' });
    }

    // Code is valid! Check expiration (e.g. 15 minutes)
    if (Date.now() - record.timestamp > 15 * 60 * 1000) {
      resetCodes.delete(cleanEmail);
      return res.status(400).json({ error: 'The reset code has expired. Please request a new code.' });
    }

    // Update password
    db.updateUser(user.id, { passwordHash: hashPassword(newPassword) });
    resetCodes.delete(cleanEmail);

    const updatedUser = db.getUserById(user.id) || user;

    res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully. Please log in with your new credentials.',
      backup: {
        id: updatedUser.id,
        email: updatedUser.email,
        passwordHash: updatedUser.passwordHash,
        isPaid: updatedUser.isPaid,
        createdAt: updatedUser.createdAt,
        twoFactorEnabled: !!updatedUser.twoFactorEnabled
      }
    });
  });

  // Get current session endpoint
  app.get('/api/auth/me', (req: Request, res: Response) => {
    // Look at request header
    const userId = req.headers['x-visitor-id'] as string;
    const userEmailHeader = (req.headers['x-user-email'] as string || '').trim().toLowerCase();

    if (!userId || !userId.startsWith('user_')) {
      return res.status(200).json({ loggedIn: false });
    }

    let user = db.getUserById(userId);
    if (!user) {
      // Automatic silent session recovery on developer sandbox server restart!
      // If client has a valid user_ ID and matched email, re-create their profile instantly.
      if (userEmailHeader && userEmailHeader.includes('@')) {
        const cleanEmail = userEmailHeader.trim().toLowerCase();
        const existingWithEmail = db.getUserByEmail(cleanEmail);
        if (existingWithEmail) {
          user = existingWithEmail;
        } else {
          const isProFounder = cleanEmail === 'support@odogwu.online' || cleanEmail === 'azubuikedavies@gmail.com';
          user = {
            id: userId,
            email: cleanEmail,
            passwordHash: hashPassword('restored_on_reboot'),
            isPaid: isProFounder ? true : false,
            createdAt: new Date().toISOString()
          };
          db.createUser(user);
        }
      } else {
        return res.status(200).json({ loggedIn: false });
      }
    }

    res.status(200).json({
      loggedIn: true,
      user: {
        id: user.id,
        email: user.email,
        isPaid: user.isPaid,
        subscriptionTier: user.subscriptionTier || (user.isPaid ? 'plus' : 'free'),
        twoFactorEnabled: !!user.twoFactorEnabled
      }
    });
  });

  // Verify Two-Factor OTP Endpoint
  app.post('/api/auth/verify-2fa', (req: Request, res: Response) => {
    const { email, code, visitorId } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification PIN code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpData = twoFactorCodes.get(cleanEmail);

    if (!otpData || otpData.code !== code.trim()) {
      return res.status(400).json({ error: 'The verification PIN is incorrect or has expired.' });
    }

    // Checking expiration (e.g., 10 minutes)
    if (Date.now() - otpData.timestamp > 10 * 60 * 1000) {
      twoFactorCodes.delete(cleanEmail);
      return res.status(400).json({ error: 'The verification PIN has expired. Please try signing in again.' });
    }

    // Success! Consume code and log in
    twoFactorCodes.delete(cleanEmail);
    const user = db.getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    if (visitorId && visitorId.trim()) {
      db.migrateVisitorQRCodes(visitorId, user.id);
    }

    const tier = user.subscriptionTier || (user.isPaid ? 'plus' : 'free');

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isPaid: user.isPaid,
        subscriptionTier: tier,
        twoFactorEnabled: true
      },
      backup: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        isPaid: user.isPaid,
        subscriptionTier: tier,
        createdAt: user.createdAt,
        twoFactorEnabled: true
      }
    });
  });

  // Toggle Two-Factor OTP configuration
  app.post('/api/auth/toggle-2fa', (req: Request, res: Response) => {
    const userId = req.headers['x-visitor-id'] as string;
    const userEmail = (req.headers['x-user-email'] as string || '').trim().toLowerCase();

    if (!userId || !userId.startsWith('user_')) {
      return res.status(401).json({ error: 'Please sign in to configure mfa credentials.' });
    }

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const currentStatus = !!user.twoFactorEnabled;
    const nextStatus = !currentStatus;

    db.updateUser(user.id, { twoFactorEnabled: nextStatus });

    res.status(200).json({
      success: true,
      twoFactorEnabled: nextStatus,
      message: nextStatus 
        ? 'Double-Authentication (2FA) credentials successfully enabled. Dynamic OTP confirmation will trigger on future logs.'
        : 'Double-Authentication (2FA) successfully disabled.'
    });
  });

  // Local Credentials Synchronizer (Self-healing on server reboots)
  app.post('/api/auth/sync-backups', (req: Request, res: Response) => {
    const { accounts } = req.body;
    if (!accounts || !Array.isArray(accounts)) {
      return res.status(400).json({ error: 'Accounts array is required.' });
    }

    let restoredCount = 0;
    accounts.forEach((acc: any) => {
      if (acc && acc.id && acc.email && acc.passwordHash) {
        const cleanEmail = acc.email.trim().toLowerCase();
        // Look up on server
        const existingByEmail = db.getUserByEmail(cleanEmail);
        const existingById = db.getUserById(acc.id);

        if (!existingByEmail && !existingById) {
          // Re-seed credentials securely
          db.createUser({
            id: acc.id,
            email: cleanEmail,
            passwordHash: acc.passwordHash,
            isPaid: !!acc.isPaid,
            twoFactorEnabled: !!acc.twoFactorEnabled,
            createdAt: acc.createdAt || new Date().toISOString()
          });
          restoredCount++;
        }
      }
    });

    res.status(200).json({ success: true, restoredCount });
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
    if (!requestingUser || (requestingUser.email.toLowerCase() !== 'support@odogwu.online' && requestingUser.email.toLowerCase() !== 'azubuikedavies@gmail.com')) {
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
    const userEmail = ((req.headers['x-user-email'] as string) || '').trim().toLowerCase();
    if (userEmail === 'support@odogwu.online' || userEmail === 'azubuikedavies@gmail.com') {
      isUserPaid = true;
    } else if (ownerId && ownerId.startsWith('user_')) {
      const user = db.getUserById(ownerId);
      if (user && (user.isPaid || user.email.toLowerCase() === 'support@odogwu.online' || user.email.toLowerCase() === 'azubuikedavies@gmail.com')) {
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

    // Securely check if user is paid
    let isUserPaid = false;
    const userEmail = ((req.headers['x-user-email'] as string) || '').trim().toLowerCase();
    if (userEmail === 'support@odogwu.online' || userEmail === 'azubuikedavies@gmail.com') {
      isUserPaid = true;
    } else if (ownerId && ownerId.startsWith('user_')) {
      const user = db.getUserById(ownerId);
      if (user && (user.isPaid || user.email.toLowerCase() === 'support@odogwu.online' || user.email.toLowerCase() === 'azubuikedavies@gmail.com')) {
        isUserPaid = true;
      }
    } else {
      // Keep demo user or local default sessions open
      isUserPaid = true;
    }

    // Enforce No-Reusing-Free-Campaign-Target restriction!
    if (!isUserPaid && longUrl !== undefined && longUrl !== existing.longUrl) {
      return res.status(403).json({
        error: 'Updating the target redirect URL of an existing QR code requires Premium (Dynamic Redirect Loops). Please upgrade to update printed QR destinations.'
      });
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

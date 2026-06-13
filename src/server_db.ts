import fs from 'fs';
import path from 'path';
import { QRCodeRecord, ScanLog, LeadRecord, BlogPost } from './types';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  isPaid: boolean;
  stripeSubscriptionId?: string;
  createdAt: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  subscriptionTier?: 'free' | 'starter' | 'plus';
}

const isVercel = !!process.env.VERCEL;
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const QR_FILE = path.join(DATA_DIR, 'qrcodes.json');
const SCAN_FILE = path.join(DATA_DIR, 'scans.json');
const LEAD_FILE = path.join(DATA_DIR, 'leads.json');
const USER_FILE = path.join(DATA_DIR, 'users.json');
const BLOG_FILE = path.join(DATA_DIR, 'blogs.json');
const SEEDED_FILE = path.join(DATA_DIR, 'seeded.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Failed to ensure DATA_DIR exists:', error);
}

// In-Memory state fallback
let qrcodes: QRCodeRecord[] = [];
let scans: ScanLog[] = [];
let leads: LeadRecord[] = [];
let users: UserRecord[] = [];
let seededUsers: string[] = [];
let blogs: BlogPost[] = [];

// Helper functions to read files with robust fault recovery per file
function loadData() {
  // 1. QR Codes
  try {
    if (fs.existsSync(QR_FILE)) {
      const content = fs.readFileSync(QR_FILE, 'utf-8').trim();
      qrcodes = content ? JSON.parse(content) : getSeedQRCodes();
    } else {
      qrcodes = getSeedQRCodes();
      saveQRCodes();
    }
  } catch (error) {
    console.error('Error loading qrcodes.json, reverting to seeds:', error);
    qrcodes = getSeedQRCodes();
  }

  // 2. Scan Logs
  try {
    if (fs.existsSync(SCAN_FILE)) {
      const content = fs.readFileSync(SCAN_FILE, 'utf-8').trim();
      scans = content ? JSON.parse(content) : getSeedScans();
    } else {
      scans = getSeedScans();
      saveScans();
    }
  } catch (error) {
    console.error('Error loading scans.json, reverting to seeds:', error);
    scans = getSeedScans();
  }

  // 3. Leads Data
  try {
    if (fs.existsSync(LEAD_FILE)) {
      const content = fs.readFileSync(LEAD_FILE, 'utf-8').trim();
      leads = content ? JSON.parse(content) : getSeedLeads();
    } else {
      leads = getSeedLeads();
      saveLeads();
    }
  } catch (error) {
    console.error('Error loading leads.json, reverting to seeds:', error);
    leads = getSeedLeads();
  }

  // 4. Secure Users Profile Database
  try {
    if (fs.existsSync(USER_FILE)) {
      const content = fs.readFileSync(USER_FILE, 'utf-8').trim();
      users = content ? JSON.parse(content) : [];
    } else {
      users = [];
      saveUsers();
    }
  } catch (error) {
    console.error('Error loading users.json database, resetting securely:', error);
    users = [];
  }

  // 5. Seeded Users Registry
  try {
    if (fs.existsSync(SEEDED_FILE)) {
      const content = fs.readFileSync(SEEDED_FILE, 'utf-8').trim();
      seededUsers = content ? JSON.parse(content) : [];
    } else {
      seededUsers = [];
      saveSeededUsers();
    }
  } catch (error) {
    console.error('Error loading seeded registry, resetting securely:', error);
    seededUsers = [];
  }

  // 6. Blog Posts
  try {
    if (fs.existsSync(BLOG_FILE)) {
      const content = fs.readFileSync(BLOG_FILE, 'utf-8').trim();
      blogs = content ? JSON.parse(content) : getSeedBlogs();
    } else {
      blogs = getSeedBlogs();
      saveBlogs();
    }
  } catch (error) {
    console.error('Error loading blogs.json, reverting to seeds:', error);
    blogs = getSeedBlogs();
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(USER_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save Users to disk', err);
  }
}

function saveSeededUsers() {
  try {
    fs.writeFileSync(SEEDED_FILE, JSON.stringify(seededUsers, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save seeded registry to disk', err);
  }
}

function saveQRCodes() {
  try {
    fs.writeFileSync(QR_FILE, JSON.stringify(qrcodes, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save QR Codes to disk', err);
  }
}

function saveScans() {
  try {
    fs.writeFileSync(SCAN_FILE, JSON.stringify(scans, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save Scans to disk', err);
  }
}

function saveLeads() {
  try {
    fs.writeFileSync(LEAD_FILE, JSON.stringify(leads, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save Leads to disk', err);
  }
}

function saveBlogs() {
  try {
    fs.writeFileSync(BLOG_FILE, JSON.stringify(blogs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save Blogs to disk', err);
  }
}

function getSeedBlogs(): BlogPost[] {
  return [
    {
      id: "blog_1",
      slug: "offline-loop-static-qr-codes-marketing",
      title: "The Offline Loop: Why Static QR Codes Are Killing Your Marketing ROI",
      excerpt: "Most businesses print traditional static QR codes and throw away valuable traffic. Here is how modern dynamic routing pivots campaigns instantly.",
      category: "Marketing Strategy",
      author: "Team Pendulum",
      readTime: "4 min read",
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      views: 247,
      content: `## The Hidden Trap of Standard QR Codes

Every day, thousands of businesses commit a silent marketing error: they print stable, hard-coded QR codes onto banners, restaurant menus, retail packages, or signage. 

When you print a **Static QR Code**, you are locking in a single, unchangeable web address. If that web address breaks, changes, or if you want to test a new offer, your printed marketing is instantly rendered **useless**. 

This is the **Static QR Trap**. You spend money on print media, physical distribution, and layout configuration, only to lose command over the direction of your user's click.

---

### Enter Dynamic QR Routing

Dynamic QR routing separates the physical print from the digital destination. Instead of embedding a direct website into the matrix, you embed a lightweight routing link (like those powered by \`Pendulum\`).

Here is what dynamic routing unlocks for your offline campaigns:

1. **Instant Swaps**: Pivot the destination of any printed code instantly. If your seasonal menu updates or your real estate listing sells, you can point the *existing* QR code to a clean backup page or fresh listing inside seconds.
2. **Double-Opt-In Lead Capture**: Before sending visitors to your primary URL, optionally present an elegant, lightning-fast lead gate. Gating the sweepstakes or menu with a quick name/email capture captures highly-qualified local intent.
3. **Physical-Digital Analytics**: Measure exactly which signs are working. Static codes provide zero details, but dynamic routing tracks exact scans, cities, mobile browser types, and real-time triggers.

### The Math: Dynamic vs Static

| Campaign Feature | Static QR Code | Dynamic Routing (Pendulum) |
| :--- | :---: | :---: |
| **Destination Editability** | ❌ Frozen Forever | ✅ Instant Hot Swaps |
| **Real-Time Analytics** | ❌ None | ✅ Scan & Device Intelligence |
| **Integrated Lead Gates** | ❌ No | ✅ Single-Click Double Opt-In |
| **Marketing Customizability**| ❌ Zero | ✅ Dynamic Rich Previews |

### How to Implement Offline Matrix Routing

To start getting real traction, avoid linking directly to subpages. Instead:
- Generate a dynamic routing code in your **Pendulum Console**
- Give it a human-friendly name (e.g., "Main Food Truck Sign")
- Designate a fallback URL, or check "Lead Capture Enabled" to harvest emails from curious customers
- Print your high-contrast code with sufficient quiet zones (white margins) to ensure instant scanning!
`
    },
    {
      id: "blog_2",
      slug: "real-estate-qr-lead-generation-strategies",
      title: "Real Estate Growth Hacking: Capture 3x More Leads on Lawn Signs",
      excerpt: "Stop forcing prospects to search addresses manually. Learn how dynamic flyers with glassmorphic contact gating transform physical drive-by traffic.",
      category: "Real Estate",
      author: "Marcus Cole",
      readTime: "5 min read",
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      views: 189,
      content: `## The Modern Homebuyer's Friction

Picture this: A prospective buyer drives past a beautiful home under active listing. They see a classic "For Sale" lawn sign. If they wanted details in past years, they had to take a shaky picture of the phone number, copy down the agent's email, or manually type in the complicated real estate portal address.

By the time they get home, **the impulse is gone**. You've lost a high-intent, local buyer because of friction.

With dynamic QR codes prominently displayed on real estate signposts, home shoppers can scan the code directly from their car window or sidewalk. But if you simply route them to the Zillow list, you get zero details on who they are!

---

### Gating Offline Drive-By Traffic

By positioning an interactive, modern lead capture gate before the listing brochure, agents capture high-resolution buyer details right at the physical signpost.

Here is the perfect signpost setup:

- **Step 1: The Clear Call-To-Action**
  On the physical layout, don't just print a blank QR code. Always border it with clear text: *"Scan to View Interior HD Tour & Pricing"*.
- **Step 2: The Translucent Lead Gate**
  When scanned, the buyer sees a fast-loading page optimized for mobile safari and chrome. Before disclosing full address brochures or pricing lists, prompt them: *"Enter your email to receive immediate price alerts for this listing."*
- **Step 3: Dynamic Redirection**
  Upon filling the form, Pendulum instantly redirects them to the high-resolution pricing page, while alerting the listing agent in real time with the new qualified lead details.

### Why Real Estate Signs Need Dynamic Redirection

Houses sell, details shift, and pricing adjustments happen daily. In the dynamic world of property management, static materials are a financial liability. If you print 50 metallic lawn sign placards, you can reuse them for *every future listing* by simply logging into Pendulum and changing the target link in one click. 
`
    },
    {
      id: "blog_3",
      slug: "physical-touchpoints-high-converting-leads",
      title: "Bridging the Gap: The Science of High-Converting Physical Touchpoints",
      excerpt: "How high-end restaurants, B2B agencies, and events leverage physical-digital triggers to command attention and harvest double-opt-in emails.",
      category: "B2B & Enterprise",
      author: "Eva Vance",
      readTime: "6 min read",
      createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      views: 112,
      content: `## The Psychology of the Scan

Why do people scan QR codes? It comes down to **immediate gratification** and **curiosity**. 

Unlike a digital banner ad that pops up on a laptop screen while a user is working, scanning a physical QR code is an active, tactile decision. A user is looking at a menu tabletop, an event pass, or a business card, and they choose to raise their camera. Consequently, **QR scanners hold a 400% higher focus index** than typical social media scrollers.

---

### Designing High-Converting Physical-Digital Triggers

To successfully convert physical interest into a digital double-opt-in, follow the three golden rules of offline triggers:

#### 1. Establish High Contrast & Safe Scaling
A beautiful custom QR code is useless if cameras can't read it. Make sure the foreground is sufficiently dark (deep charcoal, indigo, slate) and the background is bright white or cream. Always leave a "quiet zone" around the matrix so the scanner can lock onto the position anchors.

#### 2. Promise and Deliver Immediate Value
Generic text like *"Visit our website"* does not convert. Instead, promise direct value:
- Restaurant: *"Scan for Today's Secret Dessert Special"*
- Event: *"Scan to Download Tonight's Presentation Slides"*
- Retail Package: *"Scan to Unlock 15% VIP Discount"*

#### 3. Match the Visual Theme
The lead-capturing page should feel like an extension of the physical flyer itself. Using matching colors, clean modern sans typography, and professional layouts ensures the user feels safe entering their email and completing the opt-in funnel.
`
    },
    {
      id: "blog_4",
      slug: "o2o-attribution-guide-tracking-offline-marketing-ga4",
      title: "The Ultimate Guide to O2O Attribution: Tracking Offline Impact in Google Analytics 4",
      excerpt: "Many CMOs struggle to connect physical flyers, billboards, and brochures to online conversions. Learn how to configure UTM mapping and measurement protocols with dynamic O2O routing.",
      category: "Marketing Strategy",
      author: "Dr. Elena Rostov",
      readTime: "7 min read",
      createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      views: 94,
      content: `## The Offline-to-Online (O2O) Attribution Problem

For decades, physical advertising was treated as an unmeasurable branding expense. Marketers distributed brochures, mounted billboards, and mailed thousands of postcards, praying that a subset of recipients would remember the brand and type the URL at home.

In the era of **Google Analytics 4 (GA4)** and performance-driven ad spend, this lack of clarity is unacceptable.

---

### Establishing the Dynamic Redirect Mapping

To attribute direct physical traffic with flawless session accuracy, you must map your printed touchpoints to unique tracking endpoints. The strategy leverages **Dynamic URL Redirections** pre-configured with complete, detailed UTM query strings.

#### The 3-Tier UTM Blueprint

1. **utm_source**: Use a physical medium source (e.g., \`printed-flyer\`, \`billboard\`, \`package-insert\`).
2. **utm_medium**: Set this to \`physical-qr\` to isolate touchpoint scans from standard organic search or direct clicks.
3. **utm_campaign**: Customize this per launch location (e.g., \`broad-st-subway\`, \`midtown-bistro-tables\`).

Rather than printing long, ugly tracking links directly into the QR code (which yields dense, hard-to-scan codes), print a clean, short routing link. When the customer scans the code, Pendulum appends the heavy structural UTM parameter list automatically before issuing a rapid server-side redirect (\`302 Found\`) to your final landing page.

| Parameter | Standard Value | Business Insight Unlocked |
| :--- | :---: | :---: |
| **utm_source** | \`direct-mail-june\` | Identifies the physical coupon blast batch |
| **utm_medium** | \`physical-qr\` | Group as offline touchpoint traffic vs desktop direct |
| **utm_campaign** | \`boston-suburbs-campaign\`| Tracks geo-specific performance accurately |

### Capturing Gated Conversions with First-Party Cookies

When a visitor scans your O2O link, it represents their active physical interest. Placing a premium lead capture modal in front of your final content lets you match their physical location with a secure, opt-in email address.

By storing their scan session in a first-party cookie, you can feed conversion triggers directly into your CRM or Google Analytics Measurement API. This generates clean attribution pipelines where physical touchpoints are given correct, data-backed weight in your multi-touch conversions.
`
    },
    {
      id: "blog_5",
      slug: "restaurant-optimization-direct-qr-gated-menus",
      title: "Table Turnover Revolution: How Hotspots Use Contactless Menus to Boost Turnover 22%",
      excerpt: "Discover how high-volume bistros and cafes use contactless menu routing to shorten ordering delays, increase high-margin upsales, and capture loyal diners.",
      category: "Marketing Strategy",
      author: "Chef Kenji Sato",
      readTime: "5 min read",
      createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      views: 135,
      content: `## The High Cost of the Three-Minute Wait

In high-volume food and beverage operations, **time is literally revenue**. 

Analysis of diner behavior shows that the average table spends over 8 minutes in a state of "unproductive waiting":
- Waiting for physical menus to arrive after seating.
- Waiting to catch the server's eye for additional requests or drinks.
- Waiting for the final printed receipt to transition the table.

When you sit at a full restaurant menu during peak rush hour, these 8 minutes slow down your table turnover rate, limiting high-margin covers and frustrating diners.

---

### Accelerating Order Velocity with Gated Menus

By placing dynamic table-specific QR codes on tabletop inserts, hungry diners gain immediate control of their experience. 

High-performing bistros utilize a highly lucrative strategy: **The Gated Secret Special**.

When diners scan the tabletop menu code, instead of showing a plain PDF, they are welcomed by an elegant splash screen:
1. **The Opt-In Invitation**: *"Enter your email to immediately unlock today's secret chef creation & get 10% off your next lunch visit!"*
2. **Dynamic Redirection**: Once they click submit, the menu renders instantly in high-resolution, while their email is sent directly to your retention system.

This single touchpoint yields a **double benefit**: it speeds up order velocity by letting people read menus immediately, and it collects dozens of qualified, local emails daily per table.

### Operational Results: Static PDFs vs. Gated Systems

| Key Operational Metric | Static PDF Menu Upload | Dynamic Routing & Lead Capture |
| :--- | :---: | :---: |
| **Diner Email Acquisition** | ❌ 0% Growth | ✅ 34% Opt-In Conversion Rate |
| **Average Ticket Size Increase** | ❌ Minimal change | ✅ 14% Boost (via secret promos) |
| **Menu Updating Speed** | ❌ Re-upload needed | ✅ Instant backend real-time swap |
| **Table Turnover Velocity** | ❌ Stays the same | ✅ Shaved 6-8 minutes off total visit |
`
    },
    {
      id: "blog_6",
      slug: "mitigating-qr-code-quishing-attacks-enterprise-signage",
      title: "Secure-First Signage: Mitigating Fraudulent 'Quishing' in Enterprise Signage",
      excerpt: "QR code phishing (Quishing) is on the rise. Learn how enterprise organizations utilize SSL-secured dynamic proxy domains to safeguard corporate users.",
      category: "B2B & Enterprise",
      author: "Sarah Jenkins, CISSP",
      readTime: "6 min read",
      createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
      views: 74,
      content: `## The Threat Vector of Physical Quishing

As QR codes grow in popularity, malicious actors are exploring a physical vulnerability: **QR Code Phishing**, colloquially known as **Quishing**.

By attaching sticky, fraudulent QR code stickers over high-traffic public signposts (such as parking meters, electric scooter instructions, or transit maps), attackers divert unsuspecting users to malicious checkout clones, designed to harvest financial details or inject spyware.

Because a QR code cannot be read with the naked human eye, users have zero physical warning that they are scanning a hostile link.

---

### Building Enterprise Defenses Behind the Glass

To retain user trust in critical physical branding, enterprise marketing and security departments must move away from pointing physical assets to external third-party servers.

\`\`\`
[User Camera] -> [Secure Dyn Proxy URL with SSL Check] -> [Identity Verification Panel] -> [Dest landing page]
\`\`\`

#### 1. Always Use SSL-Secured Domain Proxies
If you send users directly to dynamic targets, compile them behind a corporate subdirectory proxy or proprietary SSL-hardened custom domains. This ensures the scanner's preview explicitly reads a recognizable enterprise domain, for example: \`qr.yourbrand.com/campaign\`.

#### 2. Configure Dynamic Safety Gates
Using dynamic routing services like Pendulum, enterprise teams can modify the final digital destination instantly if any compromises or domain changes are flagged by monitoring systems. If a malware scanner flags a target domain, you can route thousands of live printed plaques to a safe customer service advisory board in one click on the admin dashboard.

#### 3. Zero-Trust Access Checks
For internal enterprise operations (asset tags, warehouse barcodes, secure facility logins), integrate a swift authentication gate (such as OAuth or SSO redirect) built into the dynamic gate script, safeguarding corporate data assets from accidental scanning by unauthorized third parties.
`
    }
  ];
}

// Seed data helpers to make the dashboard look gorgeous right off the bat!
function getSeedQRCodes(): QRCodeRecord[] {
  return [
    {
      id: "menu1",
      name: "Summit Lodge Dinner Menu",
      longUrl: "https://example.com/menu/dinner-summit",
      qrType: "dynamic",
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      ownerId: "default_user",
      scanCount: 148,
      vertical: "restaurant",
      leadCaptureEnabled: false
    },
    {
      id: "re1",
      name: "405 Oakwood Dr Signage",
      longUrl: "https://example.com/real-estate/405-oakwood",
      qrType: "dynamic",
      createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
      ownerId: "default_user",
      scanCount: 89,
      vertical: "real_estate",
      leadCaptureEnabled: true,
      leadFields: ["name", "email", "phone"]
    },
    {
      id: "event1",
      name: "Neon Rhythm Fest Poster",
      longUrl: "https://example.com/events/neon-rhythm-2026",
      qrType: "dynamic",
      createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      ownerId: "default_user",
      scanCount: 215,
      vertical: "event",
      leadCaptureEnabled: false
    }
  ];
}

function getSeedScans(): ScanLog[] {
  const seedScans: ScanLog[] = [];
  const qrIds = ["menu1", "re1", "event1"];
  
  const devicesByQr: Record<string, ('Mobile' | 'Desktop' | 'Tablet')[]> = {
    menu1: ['Mobile', 'Mobile', 'Mobile', 'Tablet', 'Mobile'], // menus scanned almost rawly by Mobile
    re1: ['Mobile', 'Mobile', 'Desktop', 'Tablet'],
    event1: ['Mobile', 'Mobile', 'Mobile', 'Mobile', 'Desktop']
  };

  const countries = [
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "DE", name: "Germany" },
    { code: "CA", name: "Canada" },
    { code: "FR", name: "France" },
    { code: "JP", name: "Japan" }
  ];

  const browsers: ('Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Other')[] = ['Safari', 'Chrome', 'Chrome', 'Firefox', 'Safari'];
  const referrersByQr: Record<string, string[]> = {
    menu1: ['Table Stand QR', 'Window Sticker', 'Table Stand QR', 'Receipt Print'],
    re1: ['Yard Sign', 'Yard Sign', 'Flyer Box', 'Yard Sign'],
    event1: ['A2 Street Poster', 'Flyer Stand', 'Event Ticket QR', 'A2 Street Poster']
  };

  // Generate around 150 scans total for seed
  for (let i = 0; i < 150; i++) {
    const qrId = qrIds[i % qrIds.length];
    // Decaying distribution over the last 30 days
    const daysAgo = Math.floor(Math.pow(Math.random(), 1.5) * 30);
    const date = new Date(Date.now() - daysAgo * 24 * 3600 * 1000 - Math.random() * 24 * 3600 * 1000);
    
    const countryObj = countries[Math.floor(Math.random() * countries.length)];
    const deviceArr = devicesByQr[qrId];
    const device = deviceArr[Math.floor(Math.random() * deviceArr.length)];
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const refArr = referrersByQr[qrId];
    const referrer = refArr[Math.floor(Math.random() * refArr.length)];

    let os: 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Other' = 'Other';
    if (device === 'Mobile') {
      os = Math.random() > 0.4 ? 'iOS' : 'Android';
    } else if (device === 'Desktop') {
      os = Math.random() > 0.5 ? 'Windows' : 'macOS';
    } else {
      os = 'iOS'; // iPad
    }

    seedScans.push({
      id: `scan_${i}`,
      qrId,
      timestamp: date.toISOString(),
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      country: countryObj.code,
      countryName: countryObj.name,
      region: ["California", "New York", "London", "Berlin", "Ontario", "Tokyo"][Math.floor(Math.random() * 6)],
      city: ["San Francisco", "New York", "London", "Berlin", "Toronto", "Tokyo"][Math.floor(Math.random() * 6)],
      device,
      browser,
      os,
      referrer
    });
  }

  return seedScans;
}

function getSeedLeads(): LeadRecord[] {
  return [
    {
      id: "lead1",
      qrId: "re1",
      timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      data: { name: "Sarah Connor", email: "sarah@cyberdyne.io", phone: "+1 555-0199", notes: "Very interested in the backyard layout" }
    },
    {
      id: "lead2",
      qrId: "re1",
      timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      data: { name: "Miles Dyson", email: "mdyson@sky.net", phone: "+1 555-0123", notes: "Asked about upcoming open houses" }
    },
    {
      id: "lead3",
      qrId: "re1",
      timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      data: { name: "John Connor", email: "jconnor@resistance.net", phone: "+1 555-0144", notes: "Scheduling a structural tour" }
    }
  ];
}

// Perform initial load
loadData();

// Export accessors and mutators
export const db = {
  getQRCodes: (ownerId: string) => {
    const userCodes = qrcodes.filter(qr => qr.ownerId === ownerId);
    if (userCodes.length === 0 && ownerId !== 'default_user' && !seededUsers.includes(ownerId)) {
      // Seed codes for this new visitor so their dashboard is already beautifully populated!
      seededUsers.push(ownerId);
      saveSeededUsers();

      const suffix = ownerId.replace('visitor_', '').slice(0, 6);
      const seeds = getSeedQRCodes().map(qr => ({
        ...qr,
        id: `${qr.id}_${suffix}`, // generate a unique code for this user session
        ownerId: ownerId,
        createdAt: new Date().toISOString()
      }));
      
      // Let's also copy scans for these cloned codes so their charts look alive!
      seeds.forEach(sQr => {
        qrcodes.push(sQr);
        // Copy seed scans with correct qrId matching the base type (menu1, re1, event1)
        const baseId = sQr.id.split('_')[0];
        const templateScans = getSeedScans().filter(s => s.qrId === baseId);
        templateScans.forEach((ts, idx) => {
          scans.push({
            ...ts,
            id: `scan_${suffix}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
            qrId: sQr.id,
            timestamp: ts.timestamp
          });
        });
      });

      // Let's also copy leads!
      const originalLeads = getSeedLeads();
      originalLeads.forEach((origL, idx) => {
        // match leads to real estate template qr
        const matchingSeedQr = seeds.find(s => s.id.startsWith('re1'));
        if (matchingSeedQr) {
          leads.push({
            ...origL,
            id: `lead_${suffix}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
            qrId: matchingSeedQr.id
          });
        }
      });

      saveQRCodes();
      saveScans();
      saveLeads();
      return qrcodes.filter(qr => qr.ownerId === ownerId);
    }
    return userCodes;
  },

  getQRCodeById: (id: string) => {
    return qrcodes.find(qr => qr.id === id);
  },

  createQRCode: (record: QRCodeRecord) => {
    qrcodes.push(record);
    saveQRCodes();
    return record;
  },

  updateQRCode: (id: string, updates: Partial<QRCodeRecord>) => {
    const idx = qrcodes.findIndex(qr => qr.id === id);
    if (idx !== -1) {
      qrcodes[idx] = { ...qrcodes[idx], ...updates };
      saveQRCodes();
      return qrcodes[idx];
    }
    return null;
  },

  deleteQRCode: (id: string) => {
    qrcodes = qrcodes.filter(qr => qr.id !== id);
    scans = scans.filter(s => s.qrId !== id);
    leads = leads.filter(l => l.qrId !== id);
    saveQRCodes();
    saveScans();
    saveLeads();
    return true;
  },

  getScans: (qrIds: string[]) => {
    return scans.filter(s => qrIds.includes(s.qrId));
  },

  getScansForQRCode: (qrId: string) => {
    return scans.filter(s => s.qrId === qrId);
  },

  addScan: (scan: ScanLog) => {
    scans.push(scan);
    // Update QR scan count
    const qrIdx = qrcodes.findIndex(qr => qr.id === scan.qrId);
    if (qrIdx !== -1) {
      qrcodes[qrIdx].scanCount = (qrcodes[qrIdx].scanCount || 0) + 1;
      saveQRCodes();
    }
    saveScans();
    return scan;
  },

  getLeads: (qrIds: string[]) => {
    return leads.filter(l => qrIds.includes(l.qrId));
  },

  addLead: (lead: LeadRecord) => {
    leads.push(lead);
    saveLeads();
    return lead;
  },

  // User storage queries
  getAllUsers: () => {
    return users;
  },

  getUserByEmail: (email: string) => {
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  getUserById: (id: string) => {
    return users.find(u => u.id === id);
  },

  createUser: (record: UserRecord) => {
    users.push(record);
    saveUsers();
    return record;
  },

  updateUser: (id: string, updates: Partial<UserRecord>) => {
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      saveUsers();
      return users[idx];
    }
    return null;
  },

  migrateVisitorQRCodes: (visitorId: string, userId: string) => {
    let migratedCount = 0;
    qrcodes.forEach(qr => {
      if (qr.ownerId === visitorId) {
        qr.ownerId = userId;
        migratedCount++;
      }
    });
    if (migratedCount > 0) {
      saveQRCodes();
    }
    return migratedCount;
  },

  getAllBlogs: () => {
    return blogs;
  },

  getBlogBySlug: (slug: string) => {
    return blogs.find(b => b.slug === slug);
  },

  createBlog: (blog: BlogPost) => {
    blogs.unshift(blog); // add new blogs first
    saveBlogs();
    return blog;
  },

  incrementBlogViews: (slug: string) => {
    const b = blogs.find(item => item.slug === slug);
    if (b) {
      b.views = (b.views || 0) + 1;
      saveBlogs();
      return true;
    }
    return false;
  }
};

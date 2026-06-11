import fs from 'fs';
import path from 'path';
import { QRCodeRecord, ScanLog, LeadRecord } from './types';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  isPaid: boolean;
  stripeSubscriptionId?: string;
  createdAt: string;
}

const isVercel = !!process.env.VERCEL;
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const QR_FILE = path.join(DATA_DIR, 'qrcodes.json');
const SCAN_FILE = path.join(DATA_DIR, 'scans.json');
const LEAD_FILE = path.join(DATA_DIR, 'leads.json');
const USER_FILE = path.join(DATA_DIR, 'users.json');

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

// Helper functions to read files
function loadData() {
  try {
    if (fs.existsSync(QR_FILE)) {
      qrcodes = JSON.parse(fs.readFileSync(QR_FILE, 'utf-8'));
    } else {
      qrcodes = getSeedQRCodes();
      saveQRCodes();
    }

    if (fs.existsSync(SCAN_FILE)) {
      scans = JSON.parse(fs.readFileSync(SCAN_FILE, 'utf-8'));
    } else {
      scans = getSeedScans();
      saveScans();
    }

    if (fs.existsSync(LEAD_FILE)) {
      leads = JSON.parse(fs.readFileSync(LEAD_FILE, 'utf-8'));
    } else {
      leads = getSeedLeads();
      saveLeads();
    }

    if (fs.existsSync(USER_FILE)) {
      users = JSON.parse(fs.readFileSync(USER_FILE, 'utf-8'));
    } else {
      users = [];
      saveUsers();
    }
  } catch (error) {
    console.error('Error loading data, using in-memory fallback', error);
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(USER_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save Users to disk', err);
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
    if (userCodes.length === 0 && ownerId !== 'default_user') {
      // Seed codes for this new visitor so their dashboard is already beautifully populated!
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
  }
};

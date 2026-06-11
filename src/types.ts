/**
 * Shared types for Pendulum - Dynamic QR Codes & Scan Analytics
 */

export interface QRCodeRecord {
  id: string; // short unique code e.g. "x7G9a"
  name: string; // friendly label e.g. "Dinner Menu", "Summer Concert Flyer"
  longUrl: string; // editable target URL
  qrType: 'dynamic' | 'static';
  createdAt: string; // ISO string
  ownerId: string; // associated user
  scanCount: number;
  vertical?: string; // e.g. 'restaurant', 'realestate', 'retail', 'event'
  leadCaptureEnabled?: boolean; // leads capture support
  leadFields?: string[]; // e.g. ['name', 'email', 'phone']
}

export interface ScanLog {
  id: string;
  qrId: string;
  timestamp: string; // ISO string
  ip: string;
  country: string; // e.g. "US", "GB", "DE"
  countryName: string; // e.g. "United States"
  region: string; // e.g. "California"
  city: string; // e.g. "San Francisco"
  device: 'Mobile' | 'Desktop' | 'Tablet';
  browser: 'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Other';
  os: 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Other';
  referrer: string; // e.g. "Instagram", "Flyer Scan", "Direct"
}

export interface LeadRecord {
  id: string;
  qrId: string;
  timestamp: string;
  data: Record<string, string>; // e.g. { name: 'John Doe', email: 'john@example.com' }
}

export interface UserSession {
  id: string;
  email: string;
  isPaid: boolean;
  stripeSubscriptionId?: string;
  createdAt: string;
}

export type VerticalType = 'restaurant' | 'real_estate' | 'retail' | 'event' | 'general';

export interface VerticalConfig {
  id: VerticalType;
  title: string;
  tagline: string;
  description: string;
  ctaText: string;
  sampleName: string;
  sampleUrl: string;
  useCaseLabel: string;
  features: string[];
}

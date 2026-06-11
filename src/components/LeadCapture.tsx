import { useState, useEffect, FormEvent } from 'react';
import { QRCodeRecord } from '../types';
import { ShieldCheck, ArrowRight, AlertCircle, CheckCircle, Utensils, Home, Ticket, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../lib/api';

interface LeadCaptureProps {
  qrId: string;
}

export default function LeadCapture({ qrId }: LeadCaptureProps) {
  const [qrCode, setQrCode] = useState<QRCodeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Load QR record details to render fields
    apiFetch(`/api/qrcodes/${qrId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load QR details');
        return res.json();
      })
      .then((data: QRCodeRecord) => {
        if (data) {
          setQrCode(data);
          // Set initial fields based on config
          const initialForm: Record<string, string> = {};
          if (data.leadFields) {
            data.leadFields.forEach((f) => {
              initialForm[f] = '';
            });
          } else {
            initialForm.name = '';
            initialForm.email = '';
            initialForm.phone = '';
          }
          initialForm.notes = '';
          setFormData(initialForm);
        } else {
          setError(`QR code short ID "${qrId}" not found in system storage.`);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Error synchronizing database router connection.');
      })
      .finally(() => setLoading(false));
  }, [qrId]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch(`/api/qr/${qrId}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit registration form');
      }

      setSubmitted(true);
      setRedirecting(true);

      // Instantly open coordinates redirect
      setTimeout(() => {
        if (qrCode) {
          window.location.href = qrCode.longUrl;
        }
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('An error occurred during verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !qrCode) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-zinc-400 mt-4 font-mono font-bold uppercase tracking-wider">Synchronizing connection...</span>
      </div>
    );
  }

  if (error || !qrCode) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4 inline-block rounded-2xl shadow-premium">
          <AlertCircle className="w-8 h-8 text-rose-455" />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-tight">Access Link Broken</h2>
        <p className="text-zinc-400 text-sm mt-3 font-semibold">
          {error || 'This dynamic route has either been suspended, deactivated, or is mistyped.'}
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-5 py-3 bg-zinc-900 border border-zinc-800 text-white rounded-xl hover:bg-zinc-850 hover:border-zinc-700 transition-all cursor-pointer shadow-premium"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  // Determine beautiful localized copy based on vertical category
  let title = 'Registry Check-In';
  let subtitle = 'Quick registration required to view contents.';
  let icon = <ClipboardList className="w-8 h-8 text-indigo-400" />;
  let btnLabel = 'Proceed to Resource';

  if (qrCode.vertical === 'restaurant') {
    title = 'Digital Menu Access';
    subtitle = 'Welcome! Enter your contact details beneath to view our daily dining items & menu instantly.';
    icon = <Utensils className="w-8 h-8 text-indigo-400 animate-pulse-slow" />;
    btnLabel = 'Unlock Digital Menu';
  } else if (qrCode.vertical === 'real_estate') {
    title = 'Property Registry Portal';
    subtitle = 'Unlock high-res virtual tours, internal floor layouts, and bidding sheets for this location.';
    icon = <Home className="w-8 h-8 text-indigo-400" />;
    btnLabel = 'Unlock Listing Documents';
  } else if (qrCode.vertical === 'event') {
    title = 'Event Companion Check-In';
    subtitle = 'Register your device ticket/id to unlock local maps, scheduling calendars, and live event files.';
    icon = <Ticket className="w-8 h-8 text-indigo-400" />;
    btnLabel = 'Access Event Portal';
  }

  const fields = qrCode.leadFields || ['name', 'email', 'phone'];

  return (
    <div className="min-h-screen bg-black text-zinc-200 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-black to-black pointer-events-none z-0" />
      
      <div className="w-full max-w-md bg-[#13131c] border border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-premium relative overflow-hidden z-10">
        <div className="text-center flex flex-col items-center">
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl mb-4 relative shadow-inner">
            {icon}
            <div className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 animate-ping-slow"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </div>
          </div>
          
          <h1 className="text-2xl font-black uppercase tracking-tight text-white italic mb-2">{title}</h1>
          <p className="text-zinc-400 text-xs sm:text-sm font-semibold max-w-md mb-6 leading-relaxed">
            {subtitle}
          </p>

          <div className="text-zinc-300 text-[10px] font-mono font-bold uppercase tracking-widest mb-6 bg-zinc-900 border border-zinc-805 py-1.5 px-3.5 rounded-xl inline-flex items-center gap-1.5 shadow-md">
            <span className="w-2.5 h-2.5 bg-indigo-450 rounded-full animate-pulse-slow" />
            <span>Target:</span>
            <span className="text-zinc-100 underline truncate max-w-[150px] font-semibold">{qrCode.name}</span>
          </div>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 space-y-4 font-semibold"
          >
            <div className="inline-flex p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl shadow-premium animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold uppercase text-white">Identity Verified</h3>
              <p className="text-zinc-400 text-xs mt-2 leading-relaxed max-w-xs mx-auto">
                Thank you! Establishing routing request to secure server. Redirecting you to destination link...
              </p>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 font-mono uppercase tracking-wider pt-4">
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
              <span>Contacting target host...</span>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {fields.includes('name') && (
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-450 mb-1.5 font-mono">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-805 rounded-xl text-base text-white placeholder-zinc-500 font-semibold focus:outline-none focus:border-indigo-500 transition-all font-sans"
                />
              </div>
            )}

            {fields.includes('email') && (
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-450 mb-1.5 font-mono">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-805 rounded-xl text-base text-white placeholder-zinc-500 font-semibold focus:outline-none focus:border-indigo-500 transition-all font-sans"
                />
              </div>
            )}

            {fields.includes('phone') && (
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-450 mb-1.5 font-mono">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+1 555-0199"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-805 rounded-xl text-base text-white placeholder-zinc-500 font-semibold focus:outline-none focus:border-indigo-500 transition-all font-sans"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-450 mb-1.5 font-mono">
                Optional Message / Question
              </label>
              <textarea
                rows={2}
                placeholder="Ask about properties, booking or reservations..."
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-805 rounded-xl text-base text-white placeholder-zinc-500 font-semibold focus:outline-none focus:border-indigo-500 transition-all font-sans resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-premium transition-all disabled:opacity-50 border-none"
            >
              <span>{loading ? 'Verifying Credentials...' : btnLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[9px] text-zinc-500 font-mono font-semibold uppercase tracking-widest mt-5 pt-4 border-t border-zinc-850 w-full">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Safe redirect hosted by Pendulum QR</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

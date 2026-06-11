import { useState, FormEvent } from 'react';
import { CreditCard, Check, Sparkles, Shield, AlertCircle, RefreshCw, Star } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface BillingPortalProps {
  isPaid: boolean;
  onUpgradeSuccess: (subscriptionId: string) => void;
  onCancelPremium?: () => void;
  onClose?: () => void;
}

export default function BillingPortal({ isPaid, onUpgradeSuccess, onCancelPremium, onClose }: BillingPortalProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'plan_pick' | 'checkout' | 'success'>(isPaid ? 'success' : 'plan_pick');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeSubId = typeof window !== 'undefined' ? (localStorage.getItem('pendulum_stripe_sub_id') || 'sub_sandbox_demo') : 'sub_sandbox_demo';

  const handleStripeCheckout = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await apiFetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Failed to create Stripe Checkout Session');
      }
      // Redirect to Stripe Hosted Checkout
      window.location.href = data.url;
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error connecting to serverside Stripe API.');
    } finally {
      setLoading(false);
    }
  };


  // Auto-format helper for card formatting
  const handleCardFormat = (v: string) => {
    const clean = v.replace(/\D/g, '').substring(0, 16);
    const parts = [];
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.substring(i, i + 4));
    }
    setCardNumber(parts.join(' '));
  };

  const handleExpiryFormat = (v: string) => {
    const clean = v.replace(/\D/g, '').substring(0, 4);
    if (clean.length > 2) {
      setExpiry(`${clean.substring(0, 2)}/${clean.substring(2, 4)}`);
    } else {
      setExpiry(clean);
    }
  };

  const startCheckout = () => {
    setStage('checkout');
    setErrorMsg(null);
  };

  const handleSimulatePayment = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Basic visual checks
    const cleanCard = cardNumber.replace(/\s+/g, '');
    if (cleanCard.length < 16) {
      setErrorMsg('Invalid simulated card length. Please use standard 16 digit card.');
      return;
    }
    if (expiry.length < 5) {
      setErrorMsg('Invalid expiry block. Use MM/YY format.');
      return;
    }
    if (cvc.length < 3) {
      setErrorMsg('Invalid CVC code. Use 3 or 4 digits.');
      return;
    }
    if (!cardName) {
      setErrorMsg('Please specify cardholder full name.');
      return;
    }

    setLoading(true);

    // Simulate Stripe round-trip
    setTimeout(() => {
      setLoading(false);
      setStage('success');
      onUpgradeSuccess(`sub_stripe_${Math.random().toString(36).substr(2, 9)}`);
    }, 1800);
  };

  const cancelMockSubscription = () => {
    if (confirm('Are you sure you want to cancel your Pendulum Premium subscription? All your dynamic redirect loops will fall back to basic free-tier logic.')) {
      if (onCancelPremium) onCancelPremium();
      setStage('plan_pick');
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 relative rounded-2xl overflow-hidden h-full flex flex-col justify-between shadow-premium">
      {/* Decorative background glow source */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {stage === 'plan_pick' && (
        <div className="space-y-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-300 text-[10px] uppercase tracking-widest font-bold py-1.5 px-3.5 border border-indigo-500/20 rounded-full w-max">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pendulum Premium</span>
            </div>

            <h2 className="text-xl font-black uppercase tracking-tight text-white italic mt-4">
              Unlock the Full Engine
            </h2>
            <p className="text-zinc-400 text-xs mt-2 font-semibold leading-relaxed">
              DynaQR redirect loops is where the printed retention is. Edit destinations instant, scale campaigns, and secure lead captures.
            </p>

            <div className="my-5 flex items-baseline gap-1.5 bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-inner">
              <span className="text-4xl font-extrabold font-mono text-white">$29</span>
              <span className="text-zinc-500 text-xs font-bold uppercase">/ month</span>
              <span className="ml-auto text-[9px] font-bold uppercase text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 py-1.5 px-3 rounded-full">
                Cancel any time
              </span>
            </div>

            <ul className="space-y-3 text-xs">
              {[
                'Unlimited Dynamic Redirect QR loops',
                'Edit destination URLs any time post-printing',
                'Advanced device, country, and referrer analytics',
                'Premium QR styling & margin branding customizer',
                'High-converting Vertical Lead Capture Forms',
                'Instant CSV file exports of scan lists & leads',
              ].map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-zinc-300 font-semibold">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-1.5 font-semibold rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-2.5 mt-4">
            <button
              onClick={handleStripeCheckout}
              disabled={loading}
              className="w-full py-3.5 cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-xs rounded-xl shadow-premium transition-all inline-flex items-center justify-center gap-2 hover:shadow-indigo-500/20 border-none disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 fill-white" />
              )}
              <span>{loading ? 'Opening stripe secure checkout...' : 'Launch Live Stripe Checkout'}</span>
            </button>

            <button
              onClick={startCheckout}
              disabled={loading}
              className="w-full py-2.5 cursor-pointer bg-zinc-950 border border-zinc-800 hover:border-zinc-750 text-zinc-400 hover:text-white font-bold uppercase text-[10px] rounded-xl transition-all inline-flex items-center justify-center gap-2"
            >
              <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
              <span>Simulate Local Sandbox Card</span>
            </button>
          </div>
        </div>
      )}

      {stage === 'checkout' && (
        <form onSubmit={handleSimulatePayment} className="space-y-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
              <button
                type="button"
                onClick={() => setStage('plan_pick')}
                className="hover:text-white transition-colors"
              >
                ← Back
              </button>
              <span className="text-zinc-650">/</span>
              <span className="text-white font-bold inline-flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-400 animate-pulse" /> Secure Checkout
              </span>
            </div>

            <div className="my-4 bg-zinc-950 p-4 border border-zinc-800 rounded-xl text-xs flex justify-between font-mono shadow-inner">
              <span className="text-zinc-300 font-bold uppercase">Plan: Pendulum Premium</span>
              <span className="font-bold text-white">$29.00 USD</span>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-350 text-xs flex items-start gap-1.5 font-semibold rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3.5 mt-2">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest font-black text-zinc-400 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs placeholder-zinc-500 font-semibold focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest font-black text-zinc-400 mb-1">
                  Card Number (Simulate with: 4242...)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => handleCardFormat(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs placeholder-zinc-500 font-bold focus:outline-none font-mono focus:border-indigo-500 transition-colors"
                  />
                  <CreditCard className="w-4 h-4 text-indigo-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest font-black text-zinc-400 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => handleExpiryFormat(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs placeholder-zinc-500 font-bold focus:outline-none font-mono text-center focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest font-black text-zinc-400 mb-1">
                    Security Code
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="CVC"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs placeholder-zinc-500 font-bold focus:outline-none font-mono text-center focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-xs rounded-xl shadow-premium border-none transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Signing stripe token...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-white" />
                  <span>Authorize Charge ($29.00)</span>
                </div>
              )}
            </button>
            <div className="text-[9px] text-zinc-500 text-center font-mono font-semibold uppercase tracking-wider py-1">
              🔒 SSL Encrypted Sandbox Stripe Environment
            </div>
          </div>
        </form>
      )}

      {stage === 'success' && (
        <div className="space-y-6 flex-1 flex flex-col justify-between text-center pt-4">
          <div className="space-y-4">
            <div className="inline-flex p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl shadow-premium animate-bounce">
              <Star className="w-8 h-8 fill-indigo-400" />
            </div>

            <div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white italic">
                Premium License Active
              </h3>
              <p className="text-zinc-400 text-xs mt-2 leading-relaxed max-w-xs mx-auto font-semibold">
                Amazing! Stripe has authorized your $29/mo plan. Your limits have been upgraded. You now have unlimited redirect loops & scan log captures.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-[11px] font-mono text-zinc-300 space-y-1.5 max-w-xs mx-auto">
              <div className="flex justify-between font-semibold">
                <span>LICENSE STATUS:</span>
                <span className="text-indigo-400 font-bold">{activeSubId.startsWith('sub_stripe_') ? 'ACTIVE (LIVE)' : 'ACTIVE (SANDBOX)'}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>SUBSCRIPTION ID:</span>
                <span className="text-white font-bold truncate max-w-[120px]">{activeSubId}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>DAILY LIMITS:</span>
                <span className="text-white font-bold">UNLIMITED</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>RENEWAL DATE:</span>
                <span className="font-semibold">N/A (CANCELS ANYTIME)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={cancelMockSubscription}
              className="w-full py-2.5 cursor-pointer bg-zinc-950 border border-zinc-850 text-rose-400 hover:bg-zinc-900/60 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all"
            >
              Downgrade Plan / Reset Trial
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider block mx-auto pt-2 cursor-pointer transition-colors"
              >
                Close billing overview
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

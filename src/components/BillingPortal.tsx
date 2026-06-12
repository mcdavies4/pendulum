import { useState, FormEvent } from 'react';
import { CreditCard, Check, Sparkles, Shield, AlertCircle, RefreshCw, Star, Zap, Layers, ChevronRight } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface BillingPortalProps {
  isPaid: boolean;
  subscriptionTier?: 'free' | 'starter' | 'plus';
  onUpgradeSuccess: (subscriptionId: string, planTier?: 'starter' | 'plus') => void;
  onCancelPremium?: () => void;
  onClose?: () => void;
}

export default function BillingPortal({ 
  isPaid, 
  subscriptionTier = 'free', 
  onUpgradeSuccess, 
  onCancelPremium, 
  onClose 
}: BillingPortalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'plus'>('plus');
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
        },
        body: JSON.stringify({ planId: selectedPlan })
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
      onUpgradeSuccess(`sub_stripe_${Math.random().toString(36).substr(2, 9)}`, selectedPlan);
    }, 1800);
  };

  const cancelMockSubscription = () => {
    if (confirm('Are you sure you want to downgrade your subscription? Your dynamic campaign slots will be restricted according to standard free tier usage constraints.')) {
      if (onCancelPremium) onCancelPremium();
      setStage('plan_pick');
    }
  };

  // Pricing plans metadata
  const PLANS = [
    {
      id: 'free',
      name: 'Free Trial',
      tagline: 'Standard visual campaigns.',
      price: '$0',
      period: 'forever',
      desc: 'Test the base QR generator engine with standard redirections.',
      features: [
        'Max 2 Dynamic QR Campaigns',
        'Standard custom QR destination URLs',
        'Basic landing analytics summary',
        'Standard QR layout downloads',
      ],
      badge: 'Unlocking',
      color: 'border-zinc-800 bg-zinc-950/60',
      activeColor: 'ring-1 ring-zinc-700'
    },
    {
      id: 'starter',
      name: 'Pro Starter',
      tagline: 'Scale printed assets.',
      price: '$12',
      period: 'month',
      desc: 'Perfect for growing businesses deploying local signage and flyers.',
      features: [
        'Up to 10 Dynamic QR Campaigns',
        'Instant post-print URL updates',
        'Basic device and country logs',
        'Integrated basic routing schemes',
        'Email Support',
      ],
      badge: 'Popular',
      color: 'border-indigo-950/40 bg-zinc-900/40',
      activeColor: 'ring-2 ring-indigo-505/60 border-indigo-500/50'
    },
    {
      id: 'plus',
      name: 'Pro Plus',
      tagline: 'Full enterprise control.',
      price: '$29',
      period: 'month',
      desc: 'Ultimate control for marketing consultants and scaling agencies.',
      features: [
        'UNLIMITED Dynamic QRs',
        'Instant post-print URL updates',
        'Advanced device & referrer analytics',
        'Lead Capture interactive forms',
        'Premium QR custom styles & margins',
        'Priority 24/7 technical support',
        'Instant CSV files analytics exports',
      ],
      badge: 'Ultimate Power',
      color: 'border-violet-900/50 bg-[#121019]/60',
      activeColor: 'ring-2 ring-violet-500/70 border-violet-500/60'
    }
  ];

  return (
    <div className="bg-[#0e0c15] border border-zinc-800/80 p-6 relative rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
      {/* Decorative background visual lights */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

      {stage === 'plan_pick' && (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-300 text-[10px] uppercase tracking-widest font-bold py-1 px-3 border border-indigo-500/20 rounded-full mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Affordable Scalability</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white italic">
              Flexible Multi-Tiered Licenses
            </h2>
            <p className="text-zinc-400 text-xs mt-2 font-semibold leading-relaxed">
              DynaQR code tracking loops live where your printed retention campaigns start. Select the blueprint that matches your active campaign volume.
            </p>
          </div>

          {/* Core Plans Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            {PLANS.map((plan) => {
              const currentActive = subscriptionTier === plan.id;
              const isSelected = selectedPlan === plan.id || (plan.id === 'free' && subscriptionTier === 'free');
              
              return (
                <div 
                  key={plan.id}
                  onClick={() => {
                    if (plan.id !== 'free') {
                      setSelectedPlan(plan.id as 'starter' | 'plus');
                    }
                  }}
                  className={`border p-5 rounded-2xl flex flex-col justify-between transition-all relative cursor-pointer group ${
                    plan.id === 'free' ? 'opacity-85 hover:opacity-100' : ''
                  } ${
                    plan.id !== 'free' && selectedPlan === plan.id
                      ? 'ring-2 ring-indigo-500 bg-zinc-900 border-indigo-500/40 scale-[1.01] shadow-xl'
                      : plan.color + ' border-zinc-800/60 hover:border-zinc-700/80'
                  }`}
                >
                  {currentActive && (
                    <span className="absolute -top-2.5 left-4 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest py-0.5 px-2 rounded-md shadow-lg">
                      Active Plan
                    </span>
                  )}
                  
                  {!currentActive && plan.id !== 'free' && selectedPlan === plan.id && (
                    <span className="absolute -top-2.5 left-4 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest py-0.5 px-2 rounded-md shadow-lg animate-pulse">
                      Selected
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400 font-bold block">{plan.tagline}</span>
                      {plan.badge && (
                        <span className={`text-[8px] font-black uppercase tracking-wider py-0.5 px-1.5 rounded-full ${
                          plan.id === 'plus' ? 'bg-violet-500/15 text-violet-300' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-black uppercase text-white mt-1.5">{plan.name}</h3>
                    
                    <div className="my-3 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold font-mono text-white text-left">{plan.price}</span>
                      <span className="text-zinc-500 text-[10px] font-bold uppercase">/ {plan.period}</span>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-normal mb-4 font-medium border-b border-zinc-800 pb-3">{plan.desc}</p>

                    <ul className="space-y-2 text-[11px]">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-zinc-300 font-semibold">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-left leading-normal">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.id !== 'free' && (
                    <div className="mt-5 pt-3 border-t border-zinc-800/60">
                      <div className="flex items-center text-[10px] font-mono text-zinc-400 font-bold justify-between">
                        <span>Select Plan</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                          selectedPlan === plan.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700'
                        }`}>
                          {selectedPlan === plan.id && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-1.5 font-semibold rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <span className="text-[10px] font-mono uppercase font-black text-indigo-400 tracking-wider">Ready to Upgrade?</span>
              <p className="text-xs text-white font-bold">
                Deploying: {selectedPlan === 'starter' ? 'Pro Starter Plan ($12/mo)' : 'Pro Plus Unlimited Plan ($29/mo)'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
              <button
                onClick={startCheckout}
                disabled={loading}
                className="px-4 py-2 bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-900 transition-all cursor-pointer text-center inline-flex items-center justify-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Simulate Demo Card</span>
              </button>

              <button
                onClick={handleStripeCheckout}
                disabled={loading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-premium transition-all cursor-pointer text-center inline-flex items-center justify-center gap-1.5 hover:shadow-indigo-500/15"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 fill-white" />}
                <span>Live Stripe Checkout</span>
              </button>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-400 transition-colors uppercase tracking-widest block mx-auto cursor-pointer"
            >
              Cancel & Continue with Free limits
            </button>
          )}
        </div>
      )}

      {stage === 'checkout' && (
        <form onSubmit={handleSimulatePayment} className="space-y-5 max-w-lg mx-auto">
          <div>
            <div className="flex items-center gap-1.5 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
              <button
                type="button"
                onClick={() => setStage('plan_pick')}
                className="hover:text-white transition-colors"
              >
                ← Back to plans
              </button>
              <span className="text-zinc-700">/</span>
              <span className="text-white font-bold inline-flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-400" /> Secure Sandbox Checkout
              </span>
            </div>

            <div className="my-4 bg-zinc-950 p-4 border border-zinc-850 rounded-xl text-xs flex justify-between font-mono shadow-inner items-center">
              <div>
                <span className="text-zinc-400 font-bold text-[10px] uppercase block">Selected Tier</span>
                <span className="font-extrabold text-white text-sm">
                  {selectedPlan === 'starter' ? 'PENDULUM PRO STARTER' : 'PENDULUM PRO PLUS'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-zinc-400 font-bold text-[10px] uppercase block">Total Due</span>
                <span className="font-extrabold text-indigo-400 text-base">{selectedPlan === 'starter' ? '$12.00' : '$29.00'} USD</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-350 text-xs flex items-start gap-1.5 font-semibold rounded-lg mb-4 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest font-black text-zinc-400 mb-1 text-left">
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
                <label className="block text-[10px] uppercase font-mono tracking-widest font-black text-zinc-400 mb-1 text-left">
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
                  <CreditCard className="w-4 h-4 text-indigo-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest font-black text-zinc-400 mb-1 text-left">
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
                  <label className="block text-[10px] uppercase font-mono tracking-widest font-black text-zinc-400 mb-1 text-left">
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

          <div className="space-y-3.5 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-xs rounded-xl shadow-premium border-none transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Processing sandbox payment...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-white" />
                  <span>Authorize Charge ({selectedPlan === 'starter' ? '$12.00' : '$29.00'})</span>
                </div>
              )}
            </button>
            <div className="text-[9px] text-zinc-500 text-center font-mono font-semibold uppercase tracking-wider">
              🔒 SSL Secured Local Sandbox Payments Processor
            </div>
          </div>
        </form>
      )}

      {stage === 'success' && (
        <div className="space-y-6 max-w-md mx-auto text-center pt-4">
          <div className="space-y-4">
            <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl shadow-premium animate-bounce">
              <Star className="w-8 h-8 fill-emerald-400" />
            </div>

            <div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white italic">
                {subscriptionTier === 'starter' ? 'Pro Starter License Active' : 'Pro Plus License Active'}
              </h3>
              <p className="text-zinc-400 text-xs mt-2 leading-relaxed font-semibold">
                Amazing! Stripe has verified your secure subscription credentials. Your redirection engine caps have been upgraded.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 text-[11px] font-mono text-zinc-300 space-y-2 text-left">
              <div className="flex justify-between font-semibold">
                <span>LICENSE TIER:</span>
                <span className="text-indigo-400 font-bold uppercase">{subscriptionTier}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>LICENSE STATUS:</span>
                <span className="text-emerald-400 font-bold">{activeSubId.startsWith('sub_stripe_') ? 'ACTIVE (LIVE)' : 'ACTIVE (SANDBOX)'}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>SUBSCRIPTION ID:</span>
                <span className="text-white font-bold truncate max-w-[150px]">{activeSubId}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>MAX CAMPAIGNS LIMIT:</span>
                <span className="text-white font-bold">
                  {subscriptionTier === 'plus' ? 'UNLIMITED' : subscriptionTier === 'starter' ? '10 MAX SLOTS' : '2 MAX SLOTS'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>RENEWAL PERIOD:</span>
                <span className="font-semibold uppercase">Monthly (Cancels anytime)</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={cancelMockSubscription}
              className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-rose-400 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer"
            >
              Downgrade Tier / Cancel Subscription
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-[10px] text-zinc-500 hover:text-zinc-400 font-bold uppercase tracking-widest block mx-auto pt-1 cursor-pointer transition-colors"
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

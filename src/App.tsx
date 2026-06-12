import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LeadCapture from './components/LeadCapture';
import AuthModal from './components/AuthModal';
import LandingPage from './components/LandingPage';
import { Sparkles, Compass, ShieldCheck, Mail, LogOut, User, Sun, Moon, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch, getAccountBackups } from './lib/api';

export default function App() {
  // Path router state
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isPaid, setIsPaid] = useState<boolean>(() => {
    const saved = localStorage.getItem('pendulum_is_paid');
    return saved === 'true'; // Fallback to false by default
  });

  // User Auth States
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('pendulum_user_email');
  });
  const [userId, setUserId] = useState<string | null>(() => {
    return localStorage.getItem('pendulum_user_id');
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Decides whether to show the promotional marketing landing page first
  const [showLanding, setShowLanding] = useState<boolean>(() => {
    if (window.location.pathname.startsWith('/lead/')) return false;
    const dismissed = localStorage.getItem('pendulum_show_landing');
    if (dismissed === 'false') return false;
    // Default to true if user is not logged in, giving them an elegant presentation first!
    const activeEmail = localStorage.getItem('pendulum_user_email');
    return !activeEmail;
  });

  // Theme states: 'light' | 'dark' | 'auto'
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>(() => {
    const saved = localStorage.getItem('pendulum_theme_mode');
    return (saved as 'light' | 'dark' | 'auto') || 'auto';
  });

  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>('dark');
  const [redirectError, setRedirectError] = useState<{ error: string; code: string } | null>(null);

  // Monitor theme settings updates
  useEffect(() => {
    const updateTheme = () => {
      if (themeMode === 'auto') {
        const hour = new Date().getHours();
        const isNight = hour >= 18 || hour < 6; // Dusk at 6 PM to Dawn at 6 AM
        setActiveTheme(isNight ? 'dark' : 'light');
      } else {
        setActiveTheme(themeMode);
      }
    };

    updateTheme();
    const interval = setInterval(updateTheme, 15000); // Check periodically for changes
    return () => clearInterval(interval);
  }, [themeMode]);

  // Synchronize document attributes with current active theme context
  useEffect(() => {
    const root = document.documentElement;
    if (activeTheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    }
    localStorage.setItem('pendulum_theme_mode', themeMode);
  }, [activeTheme, themeMode]);

  const handleLoginSuccess = (uid: string, email: string, paidState: boolean) => {
    setUserId(uid);
    setUserEmail(email);
    setIsPaid(paidState);
    localStorage.setItem('pendulum_user_id', uid);
    localStorage.setItem('pendulum_user_email', email);
    localStorage.setItem('pendulum_is_paid', paidState ? 'true' : 'false');
    localStorage.setItem('pendulum_show_landing', 'false'); // auto-bypass landing on auth success!

    // Securely migrate client-side backups from visitor fallback to user account
    const visitorId = localStorage.getItem('pendulum_visitor_id');
    if (visitorId) {
      const visitorBackup = localStorage.getItem(`pendulum_qrcode_backup_${visitorId}`);
      if (visitorBackup) {
        localStorage.setItem(`pendulum_qrcode_backup_${uid}`, visitorBackup);
      }
    }

    // Force a clean reload to query actual data records matching the newly authenticated ID!
    window.location.reload();
  };

  const handleSignOut = () => {
    localStorage.removeItem('pendulum_user_id');
    localStorage.removeItem('pendulum_user_email');
    localStorage.removeItem('pendulum_is_paid');
    localStorage.removeItem('pendulum_stripe_sub_id');
    localStorage.removeItem('pendulum_show_landing'); // reset so they see intro on next click!
    setUserId(null);
    setUserEmail(null);
    setIsPaid(false);
    window.location.reload();
  };

  const handleEnterSandbox = () => {
    setShowLanding(false);
    localStorage.setItem('pendulum_show_landing', 'false');
  };

  // Handle premium upgrade toggles
  const handleUpgrade = (subscriptionId: string) => {
    setIsPaid(true);
    localStorage.setItem('pendulum_is_paid', 'true');
    localStorage.setItem('pendulum_stripe_sub_id', subscriptionId);
  };

  const handleCancelPremium = () => {
    setIsPaid(false);
    localStorage.setItem('pendulum_is_paid', 'false');
    localStorage.removeItem('pendulum_stripe_sub_id');
  };

  // Monitor location changes and Stripe callback session parameters
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    const runSessionSyncAndRecovery = async () => {
      // 1. Sync any local accounts we hold, restoring them on the server if it has booted fresh!
      const backups = getAccountBackups();
      if (backups.length > 0) {
        try {
          await apiFetch('/api/auth/sync-backups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accounts: backups })
          });
        } catch (err) {
          console.error('Failed to sync accounts list backup with server node:', err);
        }
      }

      // 2. Query/restore active session state
      try {
        const res = await apiFetch('/api/auth/me');
        const data = await res.json();
        if (data.loggedIn && data.user) {
          setUserId(data.user.id);
          setUserEmail(data.user.email);
          setIsPaid(data.user.isPaid);
          localStorage.setItem('pendulum_user_id', data.user.id);
          localStorage.setItem('pendulum_user_email', data.user.email);
          localStorage.setItem('pendulum_is_paid', data.user.isPaid ? 'true' : 'false');
        } else {
          // If the server session is deactivated but local state persists, clean up client values
          const localUid = localStorage.getItem('pendulum_user_id');
          if (localUid && localUid.startsWith('user_')) {
            localStorage.removeItem('pendulum_user_id');
            localStorage.removeItem('pendulum_user_email');
            localStorage.removeItem('pendulum_is_paid');
            localStorage.removeItem('pendulum_stripe_sub_id');
            setUserId(null);
            setUserEmail(null);
            setIsPaid(false);
          }
        }
      } catch (err) {
        console.error('Failed to sync authentication state with server nodes:', err);
      }
    };

    runSessionSyncAndRecovery();

    // Check for search parameter errors and Stripe Checkout success callbacks
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    const codeParam = params.get('code');
    
    if (errorParam === 'qr_not_found' && codeParam) {
      setRedirectError({ error: errorParam, code: codeParam });
      // clean up URL search parameters immediately for presentation
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const stripeStatus = params.get('stripe_status');
    const sessionId = params.get('session_id');

    if (stripeStatus === 'success' && sessionId) {
      // Async verify session with backend secure stripe endpoint
      apiFetch(`/api/stripe/verify-session?session_id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.subscriptionId) {
            handleUpgrade(data.subscriptionId);
            alert('🎉 Congratulations! Your Pendulum Pro plan has been activated successfully via Stripe.');
          } else {
            console.error('Stripe verification failed:', data.error);
          }
        })
        .catch((err) => {
          console.error('Network error during Stripe validation check:', err);
        })
        .finally(() => {
          // Clean up the URL bar immediately for styling
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    } else if (stripeStatus === 'cancel') {
      alert('Stripe subscription process was cancelled.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Determine route view
  let view: 'dashboard' | 'lead' = 'dashboard';
  let activeQrId = '';

  if (currentPath.startsWith('/lead/')) {
    view = 'lead';
    activeQrId = currentPath.replace('/lead/', '').split('?')[0];
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${activeTheme === 'light' ? 'bg-[#f7f9fc] text-slate-900' : 'bg-[#0c0a0f] text-[#f4f4f5]'} font-sans antialiased`}>
      
      {/* Top sticky premium glass navigation header */}
      {view === 'dashboard' && (
        <header className="bg-[#13131c]/80 backdrop-blur-md border-b border-[#2b2b3d] py-4.5 px-8 flex items-center justify-between sticky top-0 z-50 shadow-premium">
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none opacity-95 hover:opacity-100 transition-opacity"
            onClick={() => {
              setShowLanding(true);
              localStorage.setItem('pendulum_show_landing', 'true');
            }}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <div className="w-1.5 h-4 bg-white rounded-full opacity-90"></div>
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase font-sans text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
              PENDULUM
            </span>
          </div>
 
          <div className="hidden md:flex gap-8 text-xs font-black uppercase tracking-widest text-[#a1a1aa]">
            <span 
              className={`cursor-pointer transition-colors ${!showLanding ? 'text-white font-black border-b-2 border-indigo-500 pb-1' : 'hover:text-white'}`}
              onClick={() => {
                setShowLanding(false);
                localStorage.setItem('pendulum_show_landing', 'false');
              }}
            >
              Console App
            </span>
            <span 
              className={`cursor-pointer transition-colors ${showLanding ? 'text-white font-black border-b-2 border-indigo-500 pb-1' : 'hover:text-white'}`}
              onClick={() => {
                setShowLanding(true);
                localStorage.setItem('pendulum_show_landing', 'true');
              }}
            >
              Product Overview
            </span>
            {!showLanding && (
              <>
                <span className="cursor-pointer hover:text-white transition-colors" onClick={() => {
                  const el = document.getElementById('active-redirect-loops-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}>My Codes</span>
                <span className="cursor-pointer hover:text-white transition-colors" onClick={() => {
                  const el = document.getElementById('analytic-feed-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}>Analytics</span>
                <span className="cursor-pointer hover:text-white transition-colors" onClick={() => {
                  const el = document.getElementById('btn-billing-mgmt');
                  if (el) el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}>Billing</span>
              </>
            )}
          </div>
 
          <div className="flex items-center gap-4">
            {/* Intelligent Time-Based Theme Selector Segmented Slider */}
            <div className="flex items-center gap-1 bg-[#1d1d2b]/60 p-1.5 rounded-xl border border-[#2b2b40] shrink-0 shadow-inner">
              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-indigo-600 text-white shadow-sm scale-105'
                    : 'text-zinc-400 hover:text-indigo-400 hover:scale-105'
                }`}
                title="Vibrant Light Theme"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-indigo-600 text-white shadow-sm scale-105'
                    : 'text-zinc-400 hover:text-indigo-300 hover:scale-105'
                }`}
                title="Midnight Dark Theme"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('auto')}
                className={`p-1.5 rounded-lg flex items-center gap-1 transition-all duration-200 cursor-pointer ${
                  themeMode === 'auto'
                    ? 'bg-indigo-650 text-white shadow-sm scale-105'
                    : 'text-zinc-400 hover:text-indigo-300 hover:scale-105'
                }`}
                title="Intelligent Auto Theme (Dusk at 6 PM - Dawn at 6 AM)"
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[9px] font-black uppercase tracking-wider hidden sm:inline ml-0.5">Auto</span>
              </button>
            </div>

            {/* Pro vs Sandbox status pill */}
            {isPaid ? (
              <div className="hidden sm:inline-block px-3 py-1 rounded-full bg-indigo-600/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                Pro
              </div>
            ) : (
              <div className="hidden sm:inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Sandbox
              </div>
            )}

            {/* Account controls */}
            {userEmail ? (
              <div className="flex items-center gap-3 bg-[#1d1d2b]/60 px-3.5 py-1.5 rounded-xl border border-[#2b2b40]">
                <div className="flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-mono text-[11px] text-zinc-200 truncate max-w-[120px] sm:max-w-[180px]" title={userEmail}>
                    {userEmail}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out of Session"
                  className="p-1 rounded bg-[#2a2a3e]/40 hover:bg-red-500/20 text-zinc-400 hover:text-red-300 transition-all border border-[#3b3b55]/50 hover:border-red-500/30"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-blue-600/10 hover:from-indigo-500/20 hover:to-blue-600/20 border border-indigo-500/40 px-4 py-1.5 font-bold text-xs uppercase tracking-wider text-indigo-300 transition-all active:scale-[0.98]"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </header>
      )}
 
      {/* Main Page Rendering */}
      {redirectError && (
        <div className="max-w-7xl mx-auto px-8 mt-6">
          <div className="bg-amber-500/10 border border-amber-500/20 text-zinc-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5 animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-amber-500/15 rounded-xl text-amber-400 shrink-0 border border-amber-500/20">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-zinc-100 tracking-tight flex items-center gap-1.5 flex-wrap">
                  Campaign Redirection Alert
                </h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-3xl font-medium">
                  We detected that a dynamic link scan for <span className="font-mono text-amber-300 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/20">/r/{redirectError.code}</span> was attempted, but that code was not found on this server.
                  If this link points to <span className="font-semibold text-zinc-200">rightpdfkit.com</span> and was created in your browser recently, opening your **Console App / Dashboard** below will automatically re-seed your locally-saved campaigns on the server!
                </p>
              </div>
            </div>
            <button 
              onClick={() => setRedirectError(null)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700/80 active:scale-[0.98] text-zinc-200 font-bold uppercase tracking-widest text-[10px] rounded-xl border border-zinc-700/60 transition-all cursor-pointer select-none hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main>
        {view === 'lead' ? (
          <LeadCapture qrId={activeQrId} />
        ) : showLanding ? (
          <LandingPage 
            onEnterSandbox={handleEnterSandbox}
            onOpenAuth={() => setIsAuthOpen(true)}
            userEmail={userEmail}
          />
        ) : (
          <Dashboard 
            isPaid={isPaid} 
            onUpgrade={handleUpgrade}
            onCancelPremium={handleCancelPremium}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}
      </main>
 
      {/* High-fidelity Elegant Footer - Clean & Professional */}
      {view === 'dashboard' && (
        <footer className="border-t border-[#2b2b3d] py-10 bg-[#0e0c15] text-[#9393c8] text-[11px] font-bold uppercase tracking-wider mt-20 pb-14">
          <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-mono">
              <ShieldCheck className="w-4.5 h-4.5 text-indigo-400" />
              <span>Pendulum QR Routing Engine v2.5.0 • SSL</span>
            </div>
            <p className="font-sans text-[10px] text-zinc-500">Engineered for absolute reliability, instant swaps and offline matrix marketing.</p>
          </div>
        </footer>
      )}

      {/* Login & registration modal overlay */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleLoginSuccess}
      />

    </div>
  );
}

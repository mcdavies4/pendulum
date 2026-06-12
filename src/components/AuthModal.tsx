import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, LogIn, UserPlus, AlertCircle, Sparkles, Eye, EyeOff, KeyRound, CheckCircle2, Shield } from 'lucide-react';
import { apiFetch, addAccountBackup } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userId: string, email: string, isPaid: boolean) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset-code' | 'two-factor'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    const currentVisitorId = localStorage.getItem('pendulum_visitor_id') || '';

    try {
      if (mode === 'login' || mode === 'signup') {
        if (!email || !password) {
          setError('Please fill in all requested login fields.');
          setLoading(false);
          return;
        }

        const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
        const response = await apiFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            visitorId: currentVisitorId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Authentication credential validation failed.');
        }

        if (data.requiresTwoFactor) {
          setResetCode(''); // Reset input
          setMode('two-factor');
          setSuccessMessage('Double-Authentication secure confirmation required. Enter the 6-digit verification PIN.');
          if (data.simulatedOtp) {
            setSimulatedCode(data.simulatedOtp);
          }
          setLoading(false);
          return;
        }

        if (data.success && data.user) {
          localStorage.setItem('pendulum_user_id', data.user.id);
          localStorage.setItem('pendulum_user_email', data.user.email);
          localStorage.setItem('pendulum_is_paid', data.user.isPaid ? 'true' : 'false');
          
          if (data.backup) {
            addAccountBackup(data.backup);
          }
          
          onSuccess(data.user.id, data.user.email, data.user.isPaid);
          onClose();
        }
      } else if (mode === 'two-factor') {
        if (!email || !resetCode) {
          setError('Please enter the 6-digit authentication pin code.');
          setLoading(false);
          return;
        }

        const response = await apiFetch('/api/auth/verify-2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            code: resetCode,
            visitorId: currentVisitorId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Double Authentication verification failed.');
        }

        if (data.success && data.user) {
          localStorage.setItem('pendulum_user_id', data.user.id);
          localStorage.setItem('pendulum_user_email', data.user.email);
          localStorage.setItem('pendulum_is_paid', data.user.isPaid ? 'true' : 'false');
          
          if (data.backup) {
            addAccountBackup(data.backup);
          }
          
          onSuccess(data.user.id, data.user.email, data.user.isPaid);
          onClose();
        }
      } else if (mode === 'forgot') {
        if (!email) {
          setError('Please provide your account email address.');
          setLoading(false);
          return;
        }

        const response = await apiFetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Request failed.');
        }

        if (data.simulatedCode) {
          setSimulatedCode(data.simulatedCode);
        }
        
        setSuccessMessage('A verification override code has been generated for your email.');
        // Pre-fill reset code during design prototype testing
        setResetCode(data.simulatedCode || '');
        setMode('reset-code');
      } else if (mode === 'reset-code') {
        if (!email || !resetCode || !newPassword) {
          setError('Please complete all fields to reset your password.');
          setLoading(false);
          return;
        }

        const response = await apiFetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            code: resetCode,
            newPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Password reset failed.');
        }

        if (data.backup) {
          addAccountBackup(data.backup);
        }

        setSuccessMessage('Your password has been successfully reset! You can now log in.');
        setMode('login');
        setPassword('');
        setResetCode('');
        setNewPassword('');
        setSimulatedCode(null);
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      setError(err.message || 'Connecting to secure authentication node failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.35 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#2b2b40] bg-[#12111a] p-6 text-white shadow-2xl shadow-indigo-500/5 text-left"
          >
            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-zinc-400 hover:bg-[#1a1924] hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Accent */}
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="text-center mb-6">
              <div className="mx-auto w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20">
                {mode === 'forgot' || mode === 'reset-code' ? (
                  <KeyRound className="w-5 h-5 text-white" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>
              <h2 id="modal-title" className="text-xl font-bold tracking-tight">
                {mode === 'login' && 'Welcome Back to Pendulum'}
                {mode === 'signup' && 'Create Your Engine Profile'}
                {mode === 'forgot' && 'Reset Secure Password'}
                {mode === 'reset-code' && 'Enter Verification Code'}
              </h2>
              <p className="text-xs text-zinc-400 mt-1 pl-4 pr-4">
                {mode === 'login' && 'Access your custom QR routes and metrics across devices'}
                {mode === 'signup' && 'Establish a secure profile to track print campaigns'}
                {mode === 'forgot' && 'Request a prototype sandbox override code for your email address'}
                {mode === 'reset-code' && 'Provide the reset code and establish a new 6+ character password'}
              </p>
            </div>

            {/* Feedback Notifications */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </motion.div>
            )}

            {/* Simulated Mail Override for Sandbox Testing */}
            {simulatedCode && (
              <div className="mb-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 p-3 text-xs leading-normal">
                <span className="font-bold text-indigo-300 block mb-1">📬 Sandbox Email Simulation</span>
                <p className="text-zinc-300 text-[11px] mb-2">
                  Since this is a preview container sandbox environment, we have bypassed SMTP servers:
                </p>
                <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 font-mono">
                  <span className="text-[11px] text-zinc-400">Your Verification Code:</span>
                  <span id="simulated-code-val" className="font-mono font-bold text-amber-400 text-sm tracking-wider select-all">{simulatedCode}</span>
                </div>
              </div>
            )}

            {/* Account Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email Block (shown in all modes except reset-code/two-factor if prefilled) */}
              {mode !== 'reset-code' && mode !== 'two-factor' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. support@odogwu.online"
                      className="w-full rounded-xl border border-[#2b2b40] bg-[#1a1924] py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Login/Signup Password Block */}
              {(mode === 'login' || mode === 'signup') && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full rounded-xl border border-[#2b2b40] bg-[#1a1924] py-2 pl-10 pr-10 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Two-Factor Secure PIN Screen */}
              {mode === 'two-factor' && (
                <div className="space-y-4 text-left">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Double-Auth Verification PIN
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-2.5 h-4 w-4 text-indigo-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="6-digit PIN"
                        className="w-full rounded-xl border border-indigo-500/30 bg-[#1a1924] py-2.5 pl-10 pr-4 text-sm text-white focus:border-indigo-500 focus:outline-none transition-all font-mono text-center tracking-widest font-black text-lg"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#1d1b26] border border-indigo-500/15 p-3 text-[10px] text-zinc-400 leading-normal">
                    🔒 <strong>Double Authorizer Active:</strong> Two-step identity confirmation matches your high-security workspace requirements. Use the generated OTP credentials to complete session sign-in.
                  </div>
                </div>
              )}

              {/* Reset Code view options */}
              {mode === 'reset-code' && (
                <div className="space-y-4 text-left">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="6-digit generated pin"
                        className="w-full rounded-xl border border-[#2b2b40] bg-[#1a1924] py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-center tracking-widest font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full rounded-xl border border-[#2b2b40] bg-[#1a1924] py-2 pl-10 pr-10 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Seamless migration notice */}
              {(mode === 'login' || mode === 'signup') && (
                <div className="rounded-lg bg-[#251e13]/30 border border-amber-500/10 p-2.5 text-[10px] text-amber-300/90 leading-normal">
                  💡 <strong>Sandbox Sync Active:</strong> Existing dynamic link codes created in guest sandbox mode will automatically migrate to your verified profile upon registration!
                </div>
              )}

              {/* Submit Trigger */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 font-bold text-xs uppercase tracking-wider py-2.5 transition-all text-white hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Authorize Secure Session</span>
                  </>
                ) : mode === 'signup' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Initialize Profile Engine</span>
                  </>
                ) : mode === 'two-factor' ? (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Confirm 2FA PIN</span>
                  </>
                ) : mode === 'forgot' ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Request Override Token</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Confirm Password Override</span>
                  </>
                )}
              </button>
            </form>

            {/* Alternator Footer */}
            <div className="mt-5 pt-4 text-center border-t border-[#2b2b40]/50 text-xs">
              {mode === 'login' && (
                <>
                  <span className="text-zinc-400">Don't have an active account?</span>
                  <button
                    onClick={() => {
                      setMode('signup');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors underline decoration-dotted ml-1 cursor-pointer"
                  >
                    Create a profile now
                  </button>
                </>
              )}

              {mode === 'signup' && (
                <>
                  <span className="text-zinc-400">Already have a secure key?</span>
                  <button
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors underline decoration-dotted ml-1 cursor-pointer"
                  >
                    Sign in to sync
                  </button>
                </>
              )}

              {(mode === 'forgot' || mode === 'reset-code' || mode === 'two-factor') && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                    setSimulatedCode(null);
                  }}
                  className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors underline decoration-dotted cursor-pointer"
                >
                  Return to secure sign-in page
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

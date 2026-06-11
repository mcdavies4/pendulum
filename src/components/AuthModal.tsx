import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, LogIn, UserPlus, AlertCircle, Sparkles, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userId: string, email: string, isPaid: boolean) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all requested login fields.');
      setLoading(false);
      return;
    }

    const currentVisitorId = localStorage.getItem('pendulum_visitor_id') || '';

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          visitorId: currentVisitorId, // Transmit default guest ID to merge sandboxed QR codes!
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication credential validation failed.');
      }

      if (data.success && data.user) {
        // Save security credentials in local storage
        localStorage.setItem('pendulum_user_id', data.user.id);
        localStorage.setItem('pendulum_user_email', data.user.email);
        localStorage.setItem('pendulum_is_paid', data.user.isPaid ? 'true' : 'false');
        
        onSuccess(data.user.id, data.user.email, data.user.isPaid);
        onClose();
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
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#2b2b40] bg-[#12111a] p-6 text-white shadow-2xl shadow-indigo-500/5"
          >
            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-zinc-400 hover:bg-[#1a1924] hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Accent */}
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="text-center mb-6">
              <div className="mx-auto w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                {mode === 'login' ? 'Welcome Back to Pendulum' : 'Create Your Engine Profile'}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {mode === 'login'
                  ? 'Access your custom QR routes and metrics across devices'
                  : 'Establish a secure profile to track print campaigns'}
              </p>
            </div>

            {/* Error Message */}
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

            {/* Account Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Password
                </label>
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

              {/* Seamless migration notice */}
              <div className="rounded-lg bg-[#251e13]/30 border border-amber-500/10 p-2.5 text-[10px] text-amber-300/90 leading-normal">
                💡 <strong>Sandbox Sync Active:</strong> Existing dynamic link codes created in guest sandbox mode will automatically migrate to your verified profile upon registration!
              </div>

              {/* Submit Trigger */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 font-bold text-xs uppercase tracking-wider py-2.5 transition-all text-white hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Authorize Secure Session</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Initialize Profile Engine</span>
                  </>
                )}
              </button>
            </form>

            {/* Alternator Menu */}
            <div className="mt-5 pt-4 text-center border-t border-[#2b2b40]/50 text-xs">
              <span className="text-zinc-400">
                {mode === 'login' ? "Don't have an active account?" : 'Already have a secure key?'}
              </span>{' '}
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError(null);
                }}
                className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors underline decoration-dotted ml-1"
              >
                {mode === 'login' ? 'Create a profile now' : 'Sign in to sync'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

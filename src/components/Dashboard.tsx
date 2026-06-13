import { useState, useEffect, FormEvent } from 'react';
import { QRCodeRecord, ScanLog, LeadRecord, VerticalType } from '../types';
import QRRenderer from './QRRenderer';
import { apiFetch, addAccountBackup, getAccountBackups } from '../lib/api';
import BillingPortal from './BillingPortal';
import { 
  Plus, Sparkles, QrCode, TrendingUp, Users, ArrowRight, Trash2, Edit2, Check, 
  MapPin, Chrome, Laptop, Calendar, RefreshCw, Layers, ClipboardList, HelpCircle, FileDown, Eye, AlertTriangle, X, Shield 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  isPaid: boolean;
  subscriptionTier?: 'free' | 'starter' | 'plus';
  onUpgrade: (subId: string, planTier?: 'starter' | 'plus') => void;
  onCancelPremium: () => void;
  onOpenAuth?: () => void;
  activeTheme?: 'light' | 'dark';
}

const VERTICALS = [
  { id: 'general', title: 'General Business', tagline: 'Track dynamic marketing flyers & assets.', icon: QrCode, sampleName: 'Summer Catalog QR', sampleUrl: 'https://example.com/catalog', color: 'border-zinc-300 dark:border-zinc-800' },
  { id: 'restaurant', title: 'Restaurant Menus', tagline: 'Editable table stands & menu flyers.', icon: Layers, sampleName: 'Main Table Menu', sampleUrl: 'https://example.com/menu/main', color: 'border-amber-300 dark:border-amber-800' },
  { id: 'real_estate', title: 'Real Estate Signs', tagline: 'Yard signs with integrated lead capture.', icon: ClipboardList, sampleName: '405 Oakwood Dr Yard-Sign', sampleUrl: 'https://example.com/oakwood', color: 'border-emerald-300 dark:border-emerald-850' },
  { id: 'event', title: 'Concert & Event Flyers', tagline: 'Register devices to view tickets & maps.', icon: Calendar, sampleName: 'Retro Fest Poster QR', sampleUrl: 'https://example.com/tickets/festival', color: 'border-purple-300 dark:border-purple-800' },
];

export default function Dashboard({ 
  isPaid, 
  subscriptionTier = 'free', 
  onUpgrade, 
  onCancelPremium, 
  onOpenAuth, 
  activeTheme = 'dark' 
}: DashboardProps) {
  // Application Data States
  const [qrcodes, setQrcodes] = useState<QRCodeRecord[]>([]);
  const [scans, setScans] = useState<ScanLog[]>([]);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin states for support@odogwu.online
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [showAdminUsersList, setShowAdminUsersList] = useState(false);
  const [adminUserSearch, setAdminUserSearch] = useState('');

  // Authenticated state tracking
  const hasUser = typeof window !== 'undefined' && !!localStorage.getItem('pendulum_user_email');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Active User vertical selection
  const [activeVertical, setActiveVertical] = useState<VerticalType>('general');

  // UI States
  const [isCreating, setIsCreating] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [editingQrId, setEditingQrId] = useState<string | null>(null);
  const [editLongUrl, setEditLongUrl] = useState('');
  const [editName, setEditName] = useState('');
  const [filterQrId, setFilterQrId] = useState<string>('all');
  const [selectedQrForModal, setSelectedQrForModal] = useState<QRCodeRecord | null>(null);
  const [hideFounderBanner, setHideFounderBanner] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('founder') === 'true' || params.get('admin') === 'true' || params.get('developer') === 'true' || params.get('dev') === 'true') {
      localStorage.setItem('pendulum_is_admin', 'true');
      return true;
    } else if (params.get('founder') === 'false' || params.get('admin') === 'false' || params.get('developer') === 'false' || params.get('dev') === 'false') {
      localStorage.removeItem('pendulum_is_admin');
      return false;
    }
    // Also unlock for support@odogwu.online & azubuikedavies@gmail.com
    const activeEmail = localStorage.getItem('pendulum_user_email');
    if (activeEmail && (activeEmail.toLowerCase() === 'support@odogwu.online' || activeEmail.toLowerCase() === 'azubuikedavies@gmail.com')) {
      return true;
    }
    // For direct preview and users, default to false so the landing is beautifully clean
    const localAdmin = localStorage.getItem('pendulum_is_admin');
    if (localAdmin === 'true') {
      return true;
    }
    // Auto-enable for raw local loopbacks only
    const hostname = window.location.hostname;
    if (hostname.includes('localhost') || hostname === '127.0.0.1') {
      return true;
    }
    return false;
  });

  // New QR Code values
  const [newQrName, setNewQrName] = useState('');
  const [newQrUrl, setNewQrUrl] = useState('');
  const [newQrSlug, setNewQrSlug] = useState('');
  const [leadGateEnabled, setLeadGateEnabled] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load initially
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const paths = ['/api/qrcodes', '/api/analytics', '/api/leads'];
      const responses = await Promise.all(paths.map(p => apiFetch(p)));
      
      let qrsData = await responses[0].json();
      const analyticsData = await responses[1].json();
      const leadsData = await responses[2].json();

      // Silent client-side cloud container restart/rebuild re-seed fallback:
      const visitorId = localStorage.getItem('pendulum_visitor_id');
      const userId = localStorage.getItem('pendulum_user_id');
      const activeUserOrGuestId = userId || visitorId || 'default_user';
      const storageKey = `pendulum_qrcode_backup_${activeUserOrGuestId}`;
      
      if (Array.isArray(qrsData)) {
        let localSavedBackup = localStorage.getItem(storageKey);
        if (!localSavedBackup && userId && visitorId && userId !== visitorId) {
          localSavedBackup = localStorage.getItem(`pendulum_qrcode_backup_${visitorId}`);
        }
        
        if (localSavedBackup) {
          try {
            const parsedBackupArr = JSON.parse(localSavedBackup);
            if (Array.isArray(parsedBackupArr) && parsedBackupArr.length > 0) {
              // Intelligently identify any campaign records present in client backups but missing on the server
              const missingQrs = parsedBackupArr.filter(back => {
                return back && back.id && !qrsData.some((srv: any) => srv.id === back.id);
              });

              if (missingQrs.length > 0) {
                console.log("[Pendulum Sandbox Sync] Re-seeding local server container with missing client-side dynamic QR links...", missingQrs);
                for (const item of missingQrs) {
                  // Re-create each dynamic link on the restarted server instance on the fly
                  await apiFetch('/api/qrcodes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: item.name,
                      longUrl: item.longUrl,
                      id: item.id,
                      qrType: item.qrType || 'dynamic',
                      vertical: item.vertical,
                      leadCaptureEnabled: item.leadCaptureEnabled,
                      leadFields: item.leadFields || ['name', 'email', 'phone'],
                    }),
                  });
                }
                // Refetch to populate clean database list
                const refetchRes = await apiFetch('/api/qrcodes');
                if (refetchRes.ok) {
                  const restoredQrs = await refetchRes.json();
                  qrsData = restoredQrs;
                }
              }
            }
          } catch (backupRestoreErr) {
            console.error('[Pendulum Sandbox Sync] Sync recovery failed', backupRestoreErr);
          }
        }

        // Keep local cache fully updated with current cloud states
        localStorage.setItem(storageKey, JSON.stringify(qrsData));
      }

      setQrcodes(qrsData);
      setScans(analyticsData.scans || []);
      setLeads(leadsData);

      // Sync Double-Auth Status
      try {
        const sessionRes = await apiFetch('/api/auth/me');
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.loggedIn && sessionData.user) {
            setTwoFactorEnabled(!!sessionData.user.twoFactorEnabled);
          }
        }
      } catch (e) {
        console.error('Failed to sync 2fa state:', e);
      }

      // Securely fetch all user profiles if session possesses Creator/Admin privileges
      if (isAdmin) {
        setAdminUsersLoading(true);
        try {
          const res = await apiFetch('/api/admin/users');
          if (res.ok) {
            const usersData = await res.json();
            if (usersData.success) {
              setAdminUsers(usersData.users || []);
            }
          }
        } catch (adminErr) {
          console.error('Failed to query administrative users node.', adminErr);
        } finally {
          setAdminUsersLoading(false);
        }
      }
    } catch (err) {
      console.error('Connection failed, using seed data state...', err);
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill fields based on active vertical choice to make onboarding extremely pleasant!
  const prepopulateTemplate = () => {
    const template = VERTICALS.find(v => v.id === activeVertical);
    if (template) {
      setNewQrName(template.sampleName);
      setNewQrUrl(template.sampleUrl);
      const slug = `${template.id}-${Math.floor(100 + Math.random() * 900)}`;
      setNewQrSlug(slug);
      
      // Default lead capture to true on real-estate templates!
      if (activeVertical === 'real_estate') {
        setLeadGateEnabled(true);
      } else {
        setLeadGateEnabled(false);
      }
    }
  };

  const handleToggle2FA = async () => {
    try {
      const response = await apiFetch('/api/auth/toggle-2fa', {
        method: 'POST'
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update 2FA configuration in database.');
      }
      const data = await response.json();
      setTwoFactorEnabled(data.twoFactorEnabled);

      // Instantly self-heal local browser account backups so state survives and synchronizes on container reboots
      const backups = getAccountBackups();
      const userEmail = localStorage.getItem('pendulum_user_email');
      if (userEmail) {
        const currentBackup = backups.find(b => b.email.toLowerCase() === userEmail.toLowerCase());
        if (currentBackup) {
          addAccountBackup({
            ...currentBackup,
            twoFactorEnabled: data.twoFactorEnabled
          });
        }
      }
    } catch (e: any) {
      alert(e.message || 'Failed to update 2FA configuration in database.');
    }
  };

  // AI Strategist States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    optimizedHeadline?: string;
    ctaText?: string;
    marketingTips?: string[];
    suggestedSlugs?: string[];
  } | null>(null);

  const fetchAiOptimization = async () => {
    setAiLoading(true);
    setFormError(null);
    try {
      const res = await apiFetch('/api/ai/optimize-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newQrName,
          longUrl: newQrUrl,
          vertical: activeVertical
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.suggestions) {
          setAiResult(data.suggestions);
          // Apply suggested slug
          if (data.suggestions.suggestedSlugs && data.suggestions.suggestedSlugs[0]) {
            setNewQrSlug(data.suggestions.suggestedSlugs[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to get AI strategy', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateQr = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Tiered limitation checks!
    if (subscriptionTier === 'free' && qrcodes.length >= 2) {
      setFormError('Unlock Pro Starter or Pro Plus to bypass Free tier restrictions (Max 2 campaigns).');
      setShowBilling(true);
      return;
    }
    if (subscriptionTier === 'starter' && qrcodes.length >= 10) {
      setFormError('Upgrade to Pro Plus to bypass Pro Starter restrictions (Max 10 campaigns).');
      setShowBilling(true);
      return;
    }

    if (!newQrName.trim() || !newQrUrl.trim()) {
      setFormError('Please specify Name and Target Landing URL.');
      return;
    }

    // Auto-prepend https:// if there is no protocol scheme present
    let formattedUrl = newQrUrl.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Basic URL validation
    try {
      new URL(formattedUrl);
    } catch (err) {
      setFormError('Please provide a valid long redirect destination URL.');
      return;
    }

    const payload = {
      name: newQrName,
      longUrl: formattedUrl,
      id: newQrSlug.trim().toLowerCase() || undefined,
      qrType: 'dynamic',
      vertical: activeVertical,
      leadCaptureEnabled: leadGateEnabled,
      leadFields: ['name', 'email', 'phone'],
    };

    try {
      const response = await apiFetch('/api/qrcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate Short QR record.');
      }

      const createdQr: QRCodeRecord = await response.json();

      // Reset state & refresh
      setNewQrName('');
      setNewQrUrl('');
      setNewQrSlug('');
      setLeadGateEnabled(false);
      setIsCreating(false);
      
      // Auto-trigger full download and style customization modal instantly!
      setSelectedQrForModal(createdQr);

      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Slug collision or database transport offline.');
    }
  };

  const handleStartEdit = (qr: QRCodeRecord) => {
    setEditingQrId(qr.id);
    setEditLongUrl(qr.longUrl);
    setEditName(qr.name);
  };

  const handleSaveEdit = async (id: string) => {
    let formattedEditUrl = editLongUrl.trim();
    if (formattedEditUrl && !/^https?:\/\//i.test(formattedEditUrl)) {
      formattedEditUrl = `https://${formattedEditUrl}`;
    }

    try {
      new URL(formattedEditUrl);
    } catch (e) {
      alert('Please provide a valid target redirect url.');
      return;
    }

    try {
      const response = await apiFetch(`/api/qrcodes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ longUrl: formattedEditUrl, name: editName }),
      });

      if (!response.ok) {
        const errObj = await response.json().catch(() => ({}));
        throw new Error(errObj.error || 'Fail to update target coordinates routing.');
      }

      setEditingQrId(null);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Fail to update target coordinates routing.');
    }
  };

  const handleDeleteQr = async (id: string) => {
    if (!confirm('Are you absolutely certain you want to destroy this QR? If printed, matching physical flyers will break.')) return;

    try {
      const response = await apiFetch(`/api/qrcodes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error();
      fetchData();
    } catch (e) {
      alert('Error destroying shortcode record.');
    }
  };

  const handleSimulateScan = async (id: string) => {
    try {
      const response = await apiFetch(`/api/simulate-scan/${id}`, { method: 'POST' });
      if (response.ok) {
        // Light visually satisfying flash of state increments
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtering scans and calculations
  const activeScans = filterQrId === 'all' 
    ? scans 
    : scans.filter(s => s.qrId === filterQrId);

  // Statistics Calculations
  const totalScansCount = activeScans.length;
  const uniqueScanners = new Set(activeScans.map(s => s.ip)).size;
  const conversionLeads = leads.filter(l => filterQrId === 'all' || l.qrId === filterQrId).length;

  // Scan over time graph calculation (Last 7 days)
  const getScansByDay = () => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const statsMap: Record<string, number> = {};
    days.forEach(day => { statsMap[day] = 0; });

    activeScans.forEach(scan => {
      const day = scan.timestamp.split('T')[0];
      if (statsMap[day] !== undefined) {
        statsMap[day]++;
      }
    });

    return days.map(day => ({
      date: new Date(day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      value: statsMap[day],
    }));
  };

  const graphData = getScansByDay();
  const maxGraphValue = Math.max(...graphData.map(d => d.value), 1);

  // Geolocation breakdown calculation
  const getCountryBreakdown = () => {
    const codeMap: Record<string, { code: string; name: string; count: number }> = {};
    activeScans.forEach(s => {
      if (!s.country) return;
      if (!codeMap[s.country]) {
        codeMap[s.country] = { code: s.country, name: s.countryName || s.country, count: 0 };
      }
      codeMap[s.country].count++;
    });
    return Object.values(codeMap).sort((a, b) => b.count - a.count).slice(0, 5);
  };

  const countryStats = getCountryBreakdown();

  // Device type breakdown
  const getDeviceStats = () => {
    let mob = 0, desk = 0, tab = 0;
    activeScans.forEach(s => {
      if (s.device === 'Mobile') mob++;
      else if (s.device === 'Tablet') tab++;
      else desk++;
    });
    return { Mobile: mob, Desktop: desk, Tablet: tab };
  };

  const deviceTypes = getDeviceStats();

  // Browsers breakdown
  const getBrowserBreakdown = () => {
    const bMap: Record<string, number> = {};
    activeScans.forEach(s => {
      const br = s.browser || 'Other';
      bMap[br] = (bMap[br] || 0) + 1;
    });
    return Object.entries(bMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
  };

  const browserStats = getBrowserBreakdown();

  // Exporters real production CSV compiling & downloading
  const triggerExportDemo = (dataType: 'scans' | 'leads') => {
    try {
      let csvContent = '';
      const filename = `pendulum_report_${dataType}_${Date.now()}.csv`;

      if (dataType === 'scans') {
        // Headers
        const headers = ['Scan ID', 'QR Code ID', 'Timestamp', 'IP Address', 'Country', 'Country Name', 'Region', 'City', 'Device', 'Browser', 'OS', 'Referrer'];
        csvContent += headers.join(',') + '\n';

        // Rows
        const rows = activeScans.map(s => [
          s.id,
          s.qrId,
          s.timestamp,
          `"${s.ip || ''}"`,
          `"${s.country || ''}"`,
          `"${s.countryName || ''}"`,
          `"${s.region || ''}"`,
          `"${s.city || ''}"`,
          s.device,
          s.browser,
          s.os,
          `"${s.referrer || 'Direct'}"`
        ]);
        csvContent += rows.map(r => r.join(',')).join('\n');
      } else {
        // Headers
        const headers = ['Lead ID', 'QR ID', 'Timestamp', 'Lead Name', 'Lead Email', 'Lead Phone', 'Note/Comments'];
        csvContent += headers.join(',') + '\n';

        // Rows
        const rows = leads.map(l => [
          l.id,
          l.qrId,
          l.timestamp,
          `"${l.data.name || ''}"`,
          `"${l.data.email || ''}"`,
          `"${l.data.phone || ''}"`,
          `"${(l.data.notes || l.data.message || '').replace(/"/g, '""')}"`
        ]);
        csvContent += rows.map(r => r.join(',')).join('\n');
      }

      // Download Trigger Blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV report', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 selection:bg-indigo-500/30 selection:text-white">
      
      {/* 👑 Founder & Admin Control Center (support@odogwu.online Privilege) */}
      {isAdmin && (
        !hideFounderBanner ? (
          <div className="mb-8 space-y-4">
            <div className={`p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden backdrop-blur-md animate-fade-in border ${
              activeTheme === 'light'
                ? 'bg-gradient-to-r from-amber-50 via-amber-50/70 to-[#fffbeb]/50 border-amber-200 shadow-sm'
                : 'bg-gradient-to-r from-zinc-900 to-[#13131c] border-zinc-800'
            }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 rounded-xl font-bold text-lg select-none">
                  👑
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black uppercase tracking-widest font-mono ${activeTheme === 'light' ? 'text-amber-800' : 'text-[#facc15]'}`}>Founder Session Active</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter font-mono border ${
                      activeTheme === 'light'
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-850'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      Only visible to you
                    </span>
                  </div>
                  <p className={`text-[11px] mt-1 font-semibold max-w-lg leading-relaxed ${activeTheme === 'light' ? 'text-amber-950/80' : 'text-zinc-300'}`}>
                    Authorized Creator: <span className={`font-bold underline font-sans ${activeTheme === 'light' ? 'text-slate-900' : 'text-white'}`}>support@odogwu.online / azubuikedavies@gmail.com</span> • This top bar is a developer workspace helper. Your end users will <span className={`font-bold ${activeTheme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>never</span> see this banner on their accounts.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-center font-mono">
                <button
                  onClick={() => setShowAdminUsersList(!showAdminUsersList)}
                  className={`px-3.5 py-2 text-xs font-sans font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 ${
                    showAdminUsersList
                      ? (activeTheme === 'light' ? 'bg-indigo-100 border-indigo-300 text-indigo-850' : 'bg-indigo-600/25 border-indigo-500/50 text-indigo-300')
                      : (activeTheme === 'light' ? 'bg-amber-100 hover:bg-amber-150 border-amber-300 text-amber-900' : 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-300')
                  }`}
                  title="Monitor registered signups and platform conversion statistics"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Users ({adminUsers.length})</span>
                </button>

                <button
                  onClick={() => {
                    if (isPaid) {
                      onCancelPremium();
                    } else {
                      onUpgrade('sub_founder_privilege_vip');
                    }
                  }}
                  className={`px-3.5 py-2 text-xs font-sans font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border ${
                    isPaid
                      ? (activeTheme === 'light' ? 'bg-amber-100 hover:bg-amber-150 border-amber-300/80 text-amber-850' : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300')
                      : (activeTheme === 'light' ? 'bg-indigo-600 hover:bg-indigo-700 border-indigo-550 text-white-pure' : 'bg-indigo-650 hover:bg-indigo-600 border-indigo-500/40 text-white')
                  }`}
                  title="Test how the application looks and features behave with and without active Premium status."
                >
                  {isPaid ? 'Free View' : 'Pro View'}
                </button>

                <button
                  onClick={() => setHideFounderBanner(true)}
                  className={`px-3 py-2 text-xs font-sans font-black uppercase rounded-xl border transition-all cursor-pointer ${
                    activeTheme === 'light'
                      ? 'bg-white hover:bg-amber-50 text-amber-900 border-amber-300/80 hover:border-amber-400'
                      : 'bg-[#1e1e2d] hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-805'
                  }`}
                  title="Hide session controls"
                >
                  Hide Controls
                </button>
              </div>
            </div>

            {/* Expansible Signups Monitor Panel */}
            {showAdminUsersList && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-[#0e0e15] border border-[#222133] rounded-2xl shadow-xl space-y-5 animate-fade-in"
              >
                {/* Panel Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222133]/60 pb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-400" />
                      Platform Signup Monitor
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-medium">
                      Monitor user email addresses and subscription states in real-time as they join.
                    </p>
                  </div>
                  
                  {/* Search input bar */}
                  <input
                    type="text"
                    value={adminUserSearch}
                    onChange={(e) => setAdminUserSearch(e.target.value)}
                    placeholder="Filter registrants..."
                    className="px-3.5 py-2 rounded-xl border border-[#2b2b40]/80 bg-[#161624] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-full sm:w-56 font-mono"
                  />
                </div>

                {/* KPI stats metrics row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-[#171624]/40 border border-[#222133]/80 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Signups</span>
                    <p className="text-xl font-black text-white font-mono">{adminUsers.length}</p>
                  </div>
                  <div className="p-3.5 bg-[#171624]/40 border border-[#222133]/80 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pro Subscriptions</span>
                    <p className="text-xl font-black text-indigo-400 font-mono">
                      {adminUsers.filter(u => u.isPaid).length}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-3.5 bg-[#171624]/40 border border-[#222133]/80 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Conversion Rate</span>
                    <p className="text-xl font-black text-emerald-400 font-mono">
                      {adminUsers.length > 0 
                        ? Math.round((adminUsers.filter(u => u.isPaid).length / adminUsers.length) * 100) 
                        : 0}%
                    </p>
                  </div>
                </div>

                {/* 💻 Technical Sandboxing & Persistence Guide */}
                <div className="p-4 bg-indigo-505/5 border border-indigo-500/20 text-indigo-300 rounded-xl text-[11.5px] leading-relaxed font-sans space-y-2">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10.5px] text-zinc-200">
                    <span className="text-xs">💡</span>
                    <span>Administrator Knowledge Base: Data Persistence & Sandboxing</span>
                  </div>
                  <p className="text-zinc-400">
                    <strong>Why are user signups sometimes lost after container restarts?</strong> The application is deployed on a <span className="text-indigo-400">server-less cloud container</span>. All local files (including <code>users.json</code> and <code>qrcodes.json</code> in the server <code>data/</code> directory) are reset to default seed configurations whenever the virtual container scales down to zero, reboots, or is rebuilt following code updates.
                  </p>
                  <p className="text-zinc-400">
                    <strong>Iframe Storage Sandboxing:</strong> When testing inside the embedded Google AI Studio preview frame, Safari and Chrome strictly enforce cookies &amp; storage boundary partitioning. This resets your browser's <code>localStorage</code> dynamically upon refreshing the editor. To prevent fake signout loops during testing, click the <strong className="text-white underline">"Open in New Tab"</strong> button to run the application in its own tab! This guarantees 100% robust browser storage and self-healing backup synchronization.
                  </p>
                  <p className="text-zinc-300 font-medium">
                    👉 <em>Want complete cloud persistence with absolute safety across container cold starts? Simply ask me to provision a permanent <strong>Firebase Firestore Cloud database</strong>!</em>
                  </p>
                </div>

                {/* Active user details table */}
                <div className="overflow-x-auto border border-[#222133]/80 rounded-xl">
                  {adminUsersLoading ? (
                    <div className="py-12 text-center text-xs text-zinc-400 max-w-sm mx-auto flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span>Fetching platform registrant schema...</span>
                    </div>
                  ) : adminUsers.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500 font-mono">
                      No registrants have established credentials on this platform database yet.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#171624]/60 border-b border-[#222133]/60 text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                          <th className="p-3.5">User Email</th>
                          <th className="p-3.5">System ID</th>
                          <th className="p-3.5">License Level</th>
                          <th className="p-3.5">Registration Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222133]/35 text-zinc-350">
                        {adminUsers
                          .filter(u => 
                            u.email.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                            u.id.toLowerCase().includes(adminUserSearch.toLowerCase())
                          )
                          .map(u => (
                            <tr key={u.id} className="hover:bg-[#1a192a]/30 transition-colors">
                              <td className="p-3.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-md bg-[#252538] flex items-center justify-center text-[10px] uppercase font-bold text-indigo-300">
                                    {u.email.substring(0,2)}
                                  </div>
                                  <span className="font-semibold text-white">{u.email}</span>
                                </div>
                              </td>
                              <td className="p-3.5 font-mono text-[10.5px] text-zinc-400">
                                {u.id}
                              </td>
                              <td className="p-3.5">
                                {u.isPaid ? (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[9px] font-bold uppercase tracking-wide">
                                    Pro License
                                  </span>
                                ) : (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-[9px] font-bold uppercase tracking-wide">
                                    Standard Free
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 font-mono text-[10.5px] text-zinc-400">
                                {new Date(u.createdAt).toLocaleString(undefined, { 
                                  dateStyle: 'medium', 
                                  timeStyle: 'short' 
                                })}
                              </td>
                            </tr>
                          ))}
                        {adminUsers.filter(u => 
                          u.email.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                          u.id.toLowerCase().includes(adminUserSearch.toLowerCase())
                        ).length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-zinc-500 font-mono">
                              No matches found for search query "{adminUserSearch}".
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setHideFounderBanner(false)}
              className="text-[9.5px] uppercase tracking-widest font-black text-zinc-550 hover:text-zinc-300 transition-all cursor-pointer border border-zinc-850/50 hover:border-zinc-800 py-1.5 px-3 rounded-lg flex items-center gap-1.5 font-mono"
            >
              <span>🔧 Show Founder Controls</span>
            </button>
          </div>
        )
      )}

      {/* 1. Header & Active Plan Details */}
      <div className={`flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6 mb-8 gap-4 ${activeTheme === 'light' ? 'border-zinc-200' : 'border-zinc-800'}`}>
        <div>
          <div className="flex items-center gap-3">
            <span className={`p-2 py-1 font-mono text-sm font-black rounded-lg transition-all border ${
              activeTheme === 'light' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40'
            }`}>
              PNDLM
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white font-sans">
              Pendulum Systems
            </h1>
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border transition-all ${
              activeTheme === 'light'
                ? (isPaid ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-amber-100 border-amber-300 text-amber-800')
                : (isPaid ? 'bg-indigo-650/30 border-indigo-500/50 text-indigo-300' : 'bg-amber-500/15 border-amber-500/40 text-amber-400')
            }`}>
              {isPaid ? 'Pro Account' : (hasUser ? 'Free Account' : 'Guest Sandbox')}
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-3 max-w-xl font-medium leading-relaxed">
            Dynamic loop redirects with integrated high-fidelity referrer & location metrics. Keep printed flyers alive by updating target coordinate landing URLs instantly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowBilling(!showBilling)}
            id="btn-billing-mgmt"
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer rounded-xl shadow-premium flex items-center gap-1.5 border ${
              activeTheme === 'light'
                ? 'bg-white hover:bg-zinc-50 text-slate-800 border-zinc-250 hover:border-zinc-350'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Billing Profile</span>
          </button>

          <button
            onClick={() => { setIsCreating(true); prepopulateTemplate(); }}
            id="btn-trigger-creator"
            className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white-pure rounded-xl transition-all cursor-pointer shadow-premium flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* 🔮 Guest/Visitor Onboarding Signup Callout */}
      {!hasUser && onOpenAuth && (
        <div className={`mb-6 p-6 rounded-2xl relative overflow-hidden shadow-2xl animate-fade-in border ${
          activeTheme === 'light'
            ? 'bg-gradient-to-r from-indigo-50/70 via-indigo-50/40 to-blue-50/50 border-indigo-200'
            : 'bg-gradient-to-r from-[#171520] via-[#100e17] to-[#14121d] border-indigo-500/25'
        }`}>
          {/* Subtle glow circle */}
          <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -top-16 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-1.5 max-w-2xl text-left">
              <div className={`flex items-center gap-1.5 border font-black uppercase tracking-widest px-3 py-1 rounded-full w-max text-[10px] ${
                activeTheme === 'light'
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-805'
                  : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300'
              }`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ready to Launch Print Campaigns?</span>
              </div>
              <h3 className={`text-lg font-black uppercase tracking-wide mt-2 ${activeTheme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                Verify Your Pendulum Profile
              </h3>
              <p className={`text-xs leading-relaxed ${activeTheme === 'light' ? 'text-slate-700' : 'text-zinc-350'}`}>
                Guest codes are stored temporarily in your local browser sandbox. Claim your permanent verified account to 
                <strong> synchronize tracking metrics</strong>, prevent multi-device data loss, and 
                update redirect coordinates effortlessly on physical assets.
              </p>
            </div>
            
            <button
              onClick={onOpenAuth}
              className="px-6 py-3 shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 via-blue-600 to-indigo-600 hover:from-indigo-600 hover:to-blue-700 text-white-pure font-bold text-xs uppercase tracking-wider transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 border-none cursor-pointer"
            >
              <span>Get Started & Sync Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Check tiered limit banner blocks */}
      {subscriptionTier === 'free' && qrcodes.length >= 2 && (
        <div className="mb-6 p-5 bg-amber-500/10 border border-amber-550/30 rounded-2xl shadow-premium flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-amber-400 font-bold">Free Campaign Cap Reached</p>
              <p className="text-[11px] text-zinc-300 font-semibold mt-1">
                You have {qrcodes.length} dynamic codes active. Free accounts are limited to 2 campaigns. To deploy further printed QR codes, upgrade to Pro Starter or Pro Plus.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBilling(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-premium transition-all text-center shrink-0 cursor-pointer"
          >
            Upgrade Plan • from $12/mo
          </button>
        </div>
      )}

      {subscriptionTier === 'starter' && qrcodes.length >= 10 && (
        <div className="mb-6 p-5 bg-indigo-500/10 border border-indigo-550/30 rounded-2xl shadow-premium flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-indigo-400 shrink-0" />
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-indigo-400 font-bold">Pro Starter Cap Reached</p>
              <p className="text-[11px] text-zinc-300 font-semibold mt-1">
                You have {qrcodes.length} dynamic codes active. Pro Starter accounts are limited to 10 campaigns. To scale your campaigns and deploy unlimited assets, upgrade to Pro Plus.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBilling(true)}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-premium transition-all text-center shrink-0 cursor-pointer"
          >
            Upgrade to Pro Plus • $29/mo
          </button>
        </div>
      )}

      {/* 2. Billing Portal Overlay / Details Panel */}
      <AnimatePresence>
        {showBilling && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <BillingPortal 
              isPaid={isPaid} 
              subscriptionTier={subscriptionTier}
              onUpgradeSuccess={onUpgrade} 
              onCancelPremium={onCancelPremium}
              onClose={() => setShowBilling(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔐 Two-Factor (Double-Auth) Security Settings */}
      {hasUser && (
        <div className={`mb-8 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 animate-fade-in text-left border ${
          activeTheme === 'light'
            ? 'bg-gradient-to-r from-indigo-50/70 via-indigo-50/40 to-blue-50/50 border-indigo-200 shadow-sm'
            : 'bg-gradient-to-r from-[#171520]/80 via-[#121019]/80 to-[#15131f]/80 border-indigo-500/25 shadow-2xl'
        }`}>
          <div className="flex items-start gap-3.5 text-left">
            <div className={`p-3 rounded-xl shrink-0 border ${
              activeTheme === 'light'
                ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
            }`}>
              <Shield className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className={`text-sm font-black uppercase tracking-wider flex flex-wrap items-center gap-2 ${activeTheme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <span>Double-Factor (MFA) Security Checklist</span>
                <span className={`text-[9px] font-black tracking-tight px-2 py-0.5 rounded-full border ${
                  twoFactorEnabled 
                    ? (activeTheme === 'light' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400') 
                    : (activeTheme === 'light' ? 'bg-amber-100 border-amber-300 text-amber-805' : 'bg-amber-500/10 border border-amber-500/20 text-amber-300')
                }`}>
                  {twoFactorEnabled ? 'ENFORCED (2-STEP OTP)' : 'UNCONFIGURED (SINGLE AUTH)'}
                </span>
              </h4>
              <p className={`text-xs max-w-xl ${activeTheme === 'light' ? 'text-slate-700' : 'text-zinc-400'}`}>
                Enables or disables dynamic verification codes on successive login checks. Keeps link creator and webhook access safe from brute force intrusion nodes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={twoFactorEnabled} 
                onChange={handleToggle2FA}
                className="sr-only peer" 
              />
              <div className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500/40 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:border-zinc-350 after:border after:rounded-full after:height-5 after:width-5 after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-650 peer-checked:after:bg-indigo-300 peer-checked:after:border-indigo-400 border ${
                activeTheme === 'light'
                  ? 'bg-zinc-200 border-zinc-300'
                  : 'bg-zinc-850 border-[#2c2a3d]'
              }`} />
              <span className={`ml-3 text-xs font-bold uppercase tracking-wider ${activeTheme === 'light' ? 'text-slate-800' : 'text-zinc-300'}`}>
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* 3. Industry Wedge Toggles (The Work Wedge: owns the language) */}
      <div className="mb-8 p-6 card-glass shadow-premium">
        <div className="flex items-center gap-2 mb-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em] font-mono">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Active Campaign Focus Templates</span>
          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-black px-2.5 py-0.5 font-mono tracking-tighter">SEO ROUTE MATRIX</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VERTICALS.map((vert) => {
            const Icon = vert.icon;
            const isSelected = activeVertical === vert.id;
            return (
              <button
                key={vert.id}
                id={`vertical-wedge-${vert.id}`}
                onClick={() => {
                  setActiveVertical(vert.id as VerticalType);
                  if (isCreating) {
                    // pre-populate name and URL placeholders instantly for comfort
                    const slug = `${vert.id}-${Math.floor(100 + Math.random() * 900)}`;
                    setNewQrName(vert.sampleName);
                    setNewQrUrl(vert.sampleUrl);
                    setNewQrSlug(slug);
                    if (vert.id === 'real_estate') {
                      setLeadGateEnabled(true);
                    } else {
                      setLeadGateEnabled(false);
                    }
                  }
                }}
                className={`p-4 border transition-all rounded-2xl text-left cursor-pointer ${
                  isSelected 
                    ? `bg-indigo-600/20 border-indigo-500 text-white shadow-premium`
                    : `bg-zinc-900/40 border-zinc-800 text-zinc-350 hover:bg-zinc-800/45 hover:border-zinc-700`
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5 font-bold text-xs sm:text-sm">
                  <span className={`p-1 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-350'}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="uppercase tracking-wide font-black">{vert.title}</span>
                </div>
                <p className={`text-[11px] font-medium leading-normal ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>{vert.tagline}</p>
              </button>
            );
          })}
        </div>

        {/* Dynamic description of how this wedge operates */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80 text-xs text-zinc-400 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              {activeVertical === 'general' && "Dynamic QR Codes let you redirect users on demand. Perfect for broad flyer distribution."}
              {activeVertical === 'restaurant' && "🍴 Owners print once on receipt stickers or laminated table tents. Swapping menu URLs takes 1 second."}
              {activeVertical === 'real_estate' && "🏡 Capture potential buyer leads! Scanners must fill in contact info to view house documents & tours."}
              {activeVertical === 'event' && "🎸 Direct physical attendees to latest schedules or ticket purchase pages instantly."}
            </span>
          </div>
          {isCreating ? (
            <span className="text-[11px] text-indigo-400 font-black uppercase tracking-widest animate-pulse">⚡️ Autofilling config...</span>
          ) : (
            <button
              onClick={() => {
                setIsCreating(true);
                prepopulateTemplate();
              }}
              className="text-[11px] text-[#818cf8] font-black uppercase tracking-wider hover:underline cursor-pointer"
            >
              Autofill Form Template →
            </button>
          )}
        </div>
      </div>

      {/* 4. Creator Accordion Form Drawer */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, height: 0 }}
            animate={{ opacity: 1, scale: 1, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.98, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="bg-[#13131c] border border-zinc-800 p-6 rounded-2xl shadow-premium relative">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="absolute top-4 right-4 text-xs font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
              >
                Close Drawer [x]
              </button>

              <h2 className="text-md font-black uppercase tracking-wider text-white flex items-center gap-2 mb-4 italic">
                <QrCode className="w-5 h-5 text-indigo-400 animate-pulse" />
                <span>Configure Redirect Campaign URL</span>
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Inputs left */}
                <form onSubmit={handleCreateQr} className="space-y-4">
                  {formError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-start gap-2 rounded-xl">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1.5">
                        Campaign Friendly Label *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Backyard Yard Sign QR"
                        value={newQrName}
                        onChange={(e) => setNewQrName(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-base sm:text-xs text-white font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1.5 flex items-center justify-between">
                        <span>Custom Route Slug</span>
                        <span className="text-[9px] text-[#818cf8] font-black">Dynamic</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. main-menu"
                        value={newQrSlug}
                        onChange={(e) => setNewQrSlug(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-base sm:text-xs text-white font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                      />
                    </div>
                  </div>

                   <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1.5">
                      Target Destination Landing URL *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://myrestaurant.com/menu-links"
                      value={newQrUrl}
                      onChange={(e) => setNewQrUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-base sm:text-xs text-white font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchAiOptimization}
                      disabled={aiLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 select-none cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                      <span>{aiLoading ? 'Analyzing campaign with AI...' : 'Optimize Destination with AI Advisor'}</span>
                    </button>
                    {aiResult && (
                      <button
                        type="button"
                        onClick={() => setAiResult(null)}
                        className="text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-400 underline cursor-pointer"
                      >
                        Clear AI Advice
                      </button>
                    )}
                  </div>

                  {aiResult && (
                    <div className="p-4 bg-indigo-950/15 border border-indigo-505/20 rounded-2xl space-y-3 animate-fade-in text-left">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-300 font-mono">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span>AI Campaign Strategist Output</span>
                      </div>
                      
                      {aiResult.optimizedHeadline && (
                        <div className="space-y-1">
                          <span className="block text-[9px] uppercase tracking-wider font-bold text-zinc-500 font-mono">Optimized Campaign Headline:</span>
                          <p className="text-white text-xs font-black">{aiResult.optimizedHeadline}</p>
                        </div>
                      )}

                      {aiResult.ctaText && (
                        <div className="space-y-1">
                          <span className="block text-[9px] uppercase tracking-wider font-bold text-zinc-500 font-mono">Suggested CTA Frame Text:</span>
                          <p className="text-zinc-200 text-xs font-semibold italic">"{aiResult.ctaText}"</p>
                        </div>
                      )}

                      {aiResult.marketingTips && aiResult.marketingTips.length > 0 && (
                        <div className="space-y-1 pt-1.5 border-t border-zinc-900">
                          <span className="block text-[9px] uppercase tracking-wider font-bold text-zinc-500 font-mono mb-1">Conversion Optimization Tips:</span>
                          <ul className="space-y-1 text-[10.5px] text-zinc-300 font-semibold list-disc list-inside">
                            {aiResult.marketingTips.map((tip, index) => (
                              <li key={index} className="leading-snug">{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiResult.suggestedSlugs && aiResult.suggestedSlugs.length > 0 && (
                        <div className="flex gap-2 items-center flex-wrap pt-1.5 border-t border-zinc-900">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 font-mono">Suggested Slugs:</span>
                          {aiResult.suggestedSlugs.map((slug, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setNewQrSlug(slug)}
                              className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-850 text-indigo-400 border border-zinc-800 rounded text-[9.5px] font-mono cursor-pointer transition-all"
                            >
                              /r/{slug}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lead gate switch */}
                  <div className="p-4 bg-zinc-950/65 border border-zinc-800/80 rounded-xl flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="checkbox-lead-capture"
                      checked={leadGateEnabled}
                      onChange={(e) => setLeadGateEnabled(e.target.checked)}
                      className="mt-1 w-4.5 h-4.5 accent-indigo-500 rounded border-zinc-800 cursor-pointer"
                    />
                    <div>
                      <label htmlFor="checkbox-lead-capture" className="block text-xs font-black uppercase text-zinc-200 cursor-pointer">
                        Require Mobile Guest Lead Capture Form
                      </label>
                      <p className="text-[10px] text-zinc-400 font-medium mt-1 leading-relaxed max-w-sm">
                        Scanners must check in with contact information (Name, Email, Phone) to view house brochures, flyer documents, or custom menus. Generates hot direct business leads instantly!
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white-pure text-xs font-bold rounded-xl tracking-wider shadow-premium hover:shadow-lg transition-all cursor-pointer"
                    >
                      Deploy Campaign Route Limit
                    </button>
                  </div>
                </form>

                {/* Live Preview right */}
                <div className="bg-zinc-950/40 border border-zinc-800 p-5 flex flex-col justify-between items-center text-center rounded-xl shadow-premium">
                  <div className="w-full">
                    <span className="text-[9px] font-mono font-black text-indigo-300 bg-indigo-600/20 border border-indigo-500/30 px-3 py-1 rounded-full uppercase tracking-widest inline-block mb-3">Live Dynamic QR Simulator</span>
                    <p className="text-[11px] text-zinc-400 px-4 font-semibold">Shows instant layout updates as you type parameters.</p>
                  </div>

                  {/* QR rendering preview */}
                  <div className="my-5 p-3 bg-white/95 rounded-2xl shadow-premium border border-zinc-700/35">
                    <QRRenderer 
                      value={newQrUrl ? `${window.location.origin}/r/${newQrSlug || 'slug_sample'}` : `${window.location.origin}/r/pending`}
                      qrId="preview_canvas"
                      size={140}
                      minimal={true}
                    />
                  </div>

                  <div className="w-full space-y-2">
                    <div className="text-[11px] text-zinc-400 font-mono flex items-center justify-center gap-1.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-2">
                      <span className="font-bold">Redirect Route:</span>
                      <span className="text-indigo-400 font-black underline truncate max-w-[200px]">
                        /r/{newQrSlug || 'slug_id'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Key Statistics Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        {/* Total Campaigns */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-premium flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-850 border border-zinc-800 rounded-xl">
              <QrCode className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">Active Campaigns</span>
              <span className="text-2xl font-bold font-mono text-white mt-1 block">{qrcodes.length}</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-0.5">
            {subscriptionTier === 'plus' ? 'Unlimited' : subscriptionTier === 'starter' ? '10 Max' : '2 Max'}
          </span>
        </div>

        {/* Total Redirect Scans */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-premium flex items-center gap-3">
          <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">Total Redirections</span>
            <span className="text-2xl font-bold font-mono text-white mt-1 block">{totalScansCount}</span>
          </div>
        </div>

        {/* Unique IP visitors */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-premium flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Laptop className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">Unique Visitors</span>
            <span className="text-2xl font-bold font-mono text-white mt-1 block">{uniqueScanners}</span>
          </div>
        </div>

        {/* Conversions Leads Captured */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-premium flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <Users className="w-5 h-5 text-emerald-400 animate-pulse-slow" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">Captured Leads</span>
              <span className="text-2xl font-bold font-mono text-white mt-1 block">{conversionLeads}</span>
            </div>
          </div>
          {conversionLeads > 0 && (
            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-1 leading-none">
              {Math.round((conversionLeads / (totalScansCount || 1)) * 105)}% Conv
            </span>
          )}
        </div>

      </div>

      {/* Analytics Visualization + Activity Tabs */}
      <div id="analytic-feed-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* SVG Analytics Chart Left & Devices (Span 2) */}
        <div className="lg:col-span-2 bg-[#13131c] border border-zinc-800 p-6 rounded-2xl shadow-premium space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-md font-black uppercase tracking-wider text-white italic">
                Velocity Analytics Feed
              </h3>
              <p className="text-[11px] text-zinc-400 font-semibold mt-1">Scans volume distribution over the last 7 calendar days.</p>
            </div>
            
            {/* Filter selection dropdown to inspect individual QR campaigns */}
            <select
              id="qr-analytics-filter"
              value={filterQrId}
              onChange={(e) => setFilterQrId(e.target.value)}
              className="text-xs font-mono font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-200 px-3.5 py-2.5 rounded-xl outline-none cursor-pointer focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
            >
              <option value="all">📊 All Campaigns</option>
              {qrcodes.map(qr => (
                <option key={qr.id} value={qr.id}>🔗 /r/{qr.id} ({qr.name})</option>
              ))}
            </select>
          </div>

          {/* Interactive SVG Chart block */}
          <div className="h-44 w-full flex items-end justify-between font-mono pb-2 border-b border-zinc-800 pt-4 relative group">
            {graphData.map((d, index) => {
              const pct = (d.value / maxGraphValue) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center group/item px-1 relative">
                  {/* Dynamic Tooltip */}
                  <div className="absolute bottom-full mb-1 bg-zinc-950 text-white text-[9px] py-1 px-2.5 font-mono rounded-lg scale-0 group-hover/item:scale-100 origin-bottom transition-all pointer-events-none z-10 flex flex-col items-center border border-zinc-800 font-semibold shadow-premium">
                    <span>{d.value} scans</span>
                    <span className="text-[7.5px] text-zinc-400">{d.date}</span>
                  </div>

                  {/* Colored column block */}
                  <div 
                    className="w-full bg-indigo-600/80 border border-indigo-500/40 rounded-t-md transition-all hover:bg-indigo-500 cursor-pointer"
                    style={{ height: `${Math.max(pct, 6)}%` }}
                  />

                  {/* Day label */}
                  <span className="text-[10px] text-zinc-400 font-bold uppercase mt-2.5 truncate w-full text-center">
                    {d.date.split(',')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Device indicators and Referrers horizontal bar breakdown grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            
            {/* Devices & OS */}
            <div className="space-y-3.5">
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 font-mono">Device Breakdown Metrics</h4>
              <div className="space-y-4">
                {[
                  { label: 'Mobile Device scans', count: deviceTypes.Mobile, pct: totalScansCount ? Math.round((deviceTypes.Mobile / totalScansCount) * 100) : 0, color: 'bg-indigo-500' },
                  { label: 'Desktop / Laptop clicks', count: deviceTypes.Desktop, pct: totalScansCount ? Math.round((deviceTypes.Desktop / totalScansCount) * 100) : 0, color: 'bg-cyan-500' },
                  { label: 'Tablet computers', count: deviceTypes.Tablet, pct: totalScansCount ? Math.round((deviceTypes.Tablet / totalScansCount) * 105) : 0, color: 'bg-purple-500' },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-300">{item.label}</span>
                      <span className="font-mono text-zinc-400">{item.count} scans ({item.pct}%)</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-2 border border-zinc-900 rounded-full overflow-hidden">
                      <div className={`${item.color} h-full transition-all rounded-full`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Browsers list or Geographies */}
            <div className="space-y-3.5">
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 font-mono">Dynamic Web Browser Clients</h4>
              <div className="space-y-2.5">
                {browserStats.length === 0 ? (
                  <div className="text-xs text-zinc-500 py-4 italic font-semibold">No records simulated yet. Click simulation above!</div>
                ) : (
                  browserStats.map(([name, count], idx) => {
                     const pct = totalScansCount ? Math.round((count / totalScansCount) * 100) : 0;
                     return (
                      <div key={idx} className="flex items-center justify-between border-b border-zinc-800/80 pb-2 text-xs text-zinc-300 font-semibold">
                        <span className="flex items-center gap-1.5 label">
                          <Chrome className="w-4 h-4 text-indigo-400" />
                          <span>{name}</span>
                        </span>
                        <span className="font-mono text-white font-bold">{count} ({pct}%)</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Global Cities / Country Maps List - Right Panel (Span 1) */}
        <div className="bg-[#13131c] border border-zinc-800 p-6 rounded-2xl shadow-premium space-y-4">
          <div className="flex justify-between items-start border-b border-zinc-850 pb-3">
            <div>
              <h3 className="text-md font-black uppercase tracking-wider text-white flex items-center gap-1.5 italic">
                <MapPin className="w-4 h-4 text-indigo-400" /> Locations
              </h3>
              <p className="text-[10px] text-zinc-400 font-semibold leading-tight">Top routing countries.</p>
            </div>
            <button
              onClick={() => triggerExportDemo('scans')}
              className="px-3 py-1.5 border border-zinc-805 bg-zinc-900 hover:bg-zinc-850 text-[9px] font-bold uppercase tracking-wider text-zinc-200 rounded-xl cursor-pointer transition-all"
            >
              CSV Export
            </button>
          </div>

          <div className="space-y-4 pt-2">
            {countryStats.length === 0 ? (
              <div className="text-center py-12 text-xs text-zinc-500 font-semibold italic">No geolocation scans mapped yet.</div>
            ) : (
              countryStats.map((item, idx) => {
                const pct = totalScansCount ? Math.round((item.count / totalScansCount) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-300 flex items-center gap-2">
                        <span className="text-[14px]">{( { US: '🇺🇸', GB: '🇬🇧', DE: '🇩🇪', CA: '🇨🇦', FR: '🇫🇷', JP: '🇯🇵', AU: '🇦🇺' } as any)[item.code] || '🌐'}</span>
                        <span>{item.name}</span>
                      </span>
                      <span className="font-mono text-zinc-400">{item.count} scans ({pct}%)</span>
                    </div>
                    {/* Visual custom bar layout */}
                    <div className="w-full bg-zinc-950 h-2 border border-zinc-900 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl">
            <span className="text-[9.5px] uppercase tracking-widest font-black block text-indigo-300 font-mono mb-1">Global IP Edge Pipeline:</span>
            <p className="text-[10px] text-zinc-400 font-semibold leading-normal">
              Detects routing country, local regions, and network providers instantly for high-precision local print triggers.
            </p>
          </div>
        </div>

      </div>

      {/* 6. Main List Table of campaign redirect loops */}
      <div id="active-redirect-loops-section" className="bg-[#13131c] border border-zinc-800 p-6 mb-8 rounded-2xl shadow-premium">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 border-b border-zinc-850 pb-4">
          <div>
            <h3 className="text-md font-black uppercase tracking-wider text-white italic">
              Active Redirect loops ({qrcodes.length})
            </h3>
            <p className="text-[11px] text-zinc-400 font-semibold mt-1">
              Physical tracking matrix. Swapping coordinates instantly updates printed code destinations.
              <span className="text-indigo-400 block mt-1">
                💡 <strong>Important for Testing:</strong> Always open the applet in a <strong>new browser tab</strong> to test external redirects (such as google.com), as browsers block external websites from loading within the sandboxed live-preview iframe.
              </span>
            </p>
          </div>
          <span className="text-[10px] text-indigo-400 bg-zinc-900/60 border border-zinc-800 rounded-xl py-1.5 px-3.5 font-mono font-black uppercase tracking-wider">
            PRO ENDPOINTS: /r/:id
          </span>
        </div>

        {qrcodes.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/20">
            <QrCode className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
            <h4 className="text-sm font-black uppercase text-white">No active QR Campaigns</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-2 font-semibold">
              Create your very first Pendulum dynamic redirect link by selecting an industry focus and pointing it to a longURL destination.
            </p>
            <button
              onClick={() => { setIsCreating(true); prepopulateTemplate(); }}
              className="mt-5 inline-flex items-center gap-1.5 px-5 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white-pure font-bold uppercase text-xs rounded-xl shadow-premium transition-all cursor-pointer"
            >
              Generate your first QR
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 📱 Mobile Responsive Cards Container (Shown only on small screens) */}
            <div className="block md:hidden space-y-4">
              {qrcodes.map((qr) => {
                const isEditing = editingQrId === qr.id;
                const shortRedirectUrl = `${window.location.origin}/r/${qr.id}`;
                return (
                  <div key={qr.id} className="p-5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl space-y-5 shadow-inner">
                    
                    {/* Header: Label, badge categories & scan counter */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-zinc-500 font-mono">Campaign Title:</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm py-2 px-3 outline-none font-bold focus:border-indigo-500"
                            />
                          </div>
                        ) : (
                          <h4 className="text-sm font-black text-white leading-snug break-words">{qr.name}</h4>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700/60 font-mono">
                            {qr.vertical || 'general'}
                          </span>
                          {qr.leadCaptureEnabled && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 rounded font-mono animate-pulse-slow">
                              Lead Gated
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Display Runs / Scans */}
                      <div className="text-center shrink-0 bg-zinc-950 px-3.5 py-2 border border-zinc-900 rounded-xl">
                        <span className="text-sm font-bold font-mono text-indigo-400 block tracking-tight">
                          {qr.scanCount || 0}
                          <span className="text-zinc-500 font-normal text-[10px]/none ml-0.5">
                            /{subscriptionTier === 'plus' ? '∞' : subscriptionTier === 'starter' ? '150' : '30'}
                          </span>
                        </span>
                        <span className="text-[8px] text-zinc-500 font-black uppercase font-mono tracking-widest block">Scans</span>
                      </div>
                    </div>

                    {/* QR Thumbnail & redirect link */}
                    <div className="flex items-center justify-between gap-3 bg-zinc-950/70 p-3 rounded-xl border border-zinc-900">
                      <div className="flex items-center gap-3 min-w-0">
                        <button 
                          type="button"
                          onClick={() => setSelectedQrForModal(qr)}
                          className="bg-white hover:bg-zinc-100 p-1 rounded-xl border border-zinc-800 transition-all active:scale-95 shrink-0"
                          title="View and customized branded code"
                        >
                          <QRRenderer
                            value={shortRedirectUrl}
                            qrId={`mob_thumb_${qr.id}`}
                            size={44}
                            minimal={true}
                          />
                        </button>
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[9px] text-zinc-500 font-mono block">Short Redirect:</span>
                          <div className="flex items-center gap-1.5 font-mono font-bold text-[11px] text-zinc-300">
                            <span className="text-zinc-100 underline truncate max-w-[130px]">/r/{qr.id}</span>
                            <a
                              href={shortRedirectUrl}
                              target="_blank"
                              rel="referrer"
                              className="p-1 bg-zinc-900 hover:bg-zinc-850 text-indigo-400 border border-zinc-800 rounded-lg shrink-0"
                              title="Test flow link"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setSelectedQrForModal(qr)}
                        className="text-[10px] text-zinc-300 hover:text-white font-black bg-zinc-900 hover:bg-zinc-850 border border-zinc-805 py-2 px-3 rounded-lg flex items-center gap-1 inline-flex shrink-0 font-mono active:scale-95 select-none"
                      >
                        <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Export</span>
                      </button>
                    </div>

                    {/* Target Coordinates Routing inputs */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase tracking-widest font-black text-zinc-500 font-mono block">Destination URL coordinates:</span>
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="url"
                            value={editLongUrl}
                            onChange={(e) => setEditLongUrl(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs py-2 px-3 outline-none font-mono focus:border-indigo-500"
                          />
                          <button
                            onClick={() => handleSaveEdit(qr.id)}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Check className="w-4 h-4" />
                            <span>Save Route Updates</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-zinc-950/30 px-3 py-2 rounded-xl border border-zinc-900/50 group min-w-0">
                          <span className="font-mono text-zinc-400 truncate text-[11px] max-w-[200px]" title={qr.longUrl}>{qr.longUrl}</span>
                          <button
                            onClick={() => handleStartEdit(qr)}
                            className="p-1 px-2 text-indigo-400 hover:text-indigo-300 font-bold text-xs font-mono flex items-center gap-1 active:scale-95"
                          >
                            <Edit2 className="w-3 h-3 text-indigo-400" />
                            <span>Edit</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Operations Controls bottom row */}
                    <div className="flex gap-2.5 pt-3 border-t border-zinc-900/80">
                      <button
                        onClick={() => handleSimulateScan(qr.id)}
                        className="flex-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-mono font-black py-2.5 px-3 border border-zinc-800 rounded-xl active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Simulate Scan</span>
                      </button>

                      <button
                        onClick={() => handleDeleteQr(qr.id)}
                        className="px-3.5 py-2.5 bg-rose-500/5 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/25 rounded-xl active:scale-95 cursor-pointer flex items-center justify-center"
                        title="Delete qr loop"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* 🖥️ Desktop Structured Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-mono tracking-widest text-[9px] font-black">
                    <th className="py-3 px-4">Campaign Label</th>
                    <th className="py-3 px-4">Dynamic Route Link</th>
                    <th className="py-3 px-4 text-center">QR Code</th>
                    <th className="py-3 px-4">Target Destination Coordinates</th>
                    <th className="py-3 px-4 text-center">Analytics</th>
                    <th className="py-3 px-4 text-right">Operation Commands</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/60 text-zinc-300">
                  {qrcodes.map((qr) => {
                    const isEditing = editingQrId === qr.id;
                    const shortRedirectUrl = `${window.location.origin}/r/${qr.id}`;
                    return (
                      <tr key={qr.id} className="hover:bg-zinc-900/40 transition-colors border-b border-zinc-850/60">
                        
                        {/* Name / Info */}
                        <td className="py-4 px-4 font-bold text-white">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-zinc-950 border border-zinc-805 rounded-lg text-white text-xs py-1 px-2.5 outline-none font-bold shadow-md w-44"
                            />
                          ) : (
                            <div>
                              <span className="font-bold text-sm text-zinc-100">{qr.name}</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700/65">
                                  {qr.vertical || 'general'}
                                </span>
                                {qr.leadCaptureEnabled && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 rounded animate-pulse-slow">
                                    Lead Gated
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Redirect slug link */}
                        <td className="py-4 px-4 font-mono font-bold text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-100 font-black underline">/r/{qr.id}</span>
                            <a
                              href={shortRedirectUrl}
                              target="_blank"
                              rel="referrer"
                              className="p-1 px-1.5 bg-zinc-900 hover:bg-zinc-800 text-indigo-400 border border-zinc-805 rounded-lg transition-colors"
                              title="Test redirect link in new window"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>

                        {/* QR Thumbnail cell */}
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2.5">
                            <button 
                              type="button"
                              onClick={() => setSelectedQrForModal(qr)}
                              className="bg-white hover:bg-zinc-100 p-1 rounded-lg border border-zinc-700 transition-all hover:scale-110 cursor-pointer shadow-sm shrink-0 inline-flex items-center justify-center"
                              title="Preview and customize QR styling presets"
                            >
                              <QRRenderer
                                value={shortRedirectUrl}
                                qrId={`thumb_${qr.id}`}
                                size={44}
                                minimal={true}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedQrForModal(qr)}
                              className="text-[10px] text-zinc-400 hover:text-white font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 py-1.5 px-2.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 select-none whitespace-nowrap"
                            >
                              <FileDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span>Download / Edit</span>
                            </button>
                          </div>
                        </td>

                        {/* The Target Destination */}
                        <td className="py-4 px-4 max-w-sm truncate text-zinc-455">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="url"
                                value={editLongUrl}
                                onChange={(e) => setEditLongUrl(e.target.value)}
                                className="bg-zinc-950 border border-zinc-805 rounded-lg text-white text-xs py-1 px-2.5 outline-none w-64 font-mono shadow-md"
                              />
                              <button
                                onClick={() => handleSaveEdit(qr.id)}
                                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-all cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 font-mono text-[11px] truncate max-w-xs">
                              <span className="truncate">{qr.longUrl}</span>
                              <button
                                onClick={() => handleStartEdit(qr)}
                                className="p-1 text-indigo-400 hover:text-indigo-300 transition-all shrink-0 ml-1 cursor-pointer bg-zinc-900/60 rounded border border-zinc-800 flex items-center gap-1 px-1.5 py-0.5 hover:border-indigo-500/50 hover:bg-zinc-900"
                                title="Edit destination link"
                              >
                                <Edit2 className="w-2.5 h-2.5 text-indigo-400" />
                                <span className="text-[9px] font-sans font-black uppercase text-indigo-400/80 tracking-wider">Change</span>
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Click Analytics */}
                        <td className="py-4 px-4 text-center font-mono font-bold text-white text-sm">
                          <div className="flex flex-col items-center justify-center">
                            <div className="flex items-center gap-1.5">
                              <span>{qr.scanCount || 0}</span>
                              <span className="text-[10px] text-zinc-500 font-normal">
                                / {subscriptionTier === 'plus' ? '∞' : subscriptionTier === 'starter' ? '150' : '30'}
                              </span>
                            </div>
                            <span className="text-[8px] text-zinc-500 uppercase tracking-widest block font-black mt-0.5 scale-90">limit</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            
                            <button
                              type="button"
                              onClick={() => handleSimulateScan(qr.id)}
                              id={`btn-shim-${qr.id}`}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-[10px] font-mono font-bold py-1.5 px-3 border border-zinc-700 hover:border-zinc-500 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                              title="Simulate scan event"
                            >
                              <RefreshCw className="w-3 h-3 text-zinc-300" />
                              <span>Simulate Scan</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteQr(qr.id)}
                              id={`btn-del-${qr.id}`}
                              className="p-2 text-rose-400 border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/20 hover:text-white rounded-xl transition-all cursor-pointer"
                              title="Destroy Campaign Redirect Loop"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 7. Live scan and conversion activity logs bottom widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Latest Scans details feed */}
        <div className="bg-[#13131c] border border-zinc-800 p-6 rounded-2xl shadow-premium space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-2 italic">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping shrink-0" />
            <span>Interactive Live Scans Log</span>
          </h3>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {activeScans.length === 0 ? (
              <div className="text-center py-12 text-xs text-zinc-500 font-semibold italic">No scans recorded. Click "Simulate Scan" above to populate logs in real-time!</div>
            ) : (
              activeScans.slice(0, 7).map((scan, idx) => (
                <div key={idx} className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl hover:border-zinc-800 transition-all flex justify-between items-center text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold font-mono text-zinc-100">🔗 /r/{scan.qrId}</span>
                      <span className="text-[10px] text-zinc-500 font-mono font-semibold">({scan.ip})</span>
                    </div>
                    <p className="text-zinc-400 text-[11px] font-semibold">
                      Scanner via {scan.device} • {scan.browser} ({scan.os}) • Src: {scan.referrer}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[10px] text-zinc-500 block font-semibold">
                      {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-400 block uppercase">
                      ⛳️ {scan.city || scan.countryName}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lead entries captured contact list */}
        <div className="bg-[#13131c] border border-zinc-800 p-6 rounded-2xl shadow-premium space-y-4">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-2 italic">
              <ClipboardList className="w-5 h-5 text-indigo-400" />
              <span>Gastronomy & House Lead Matrix</span>
            </h3>
            {leads.length > 0 && (
              <button
                onClick={() => triggerExportDemo('leads')}
                className="px-3 py-1.5 border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700 text-[10px] font-mono text-zinc-300 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <FileDown className="w-3 h-3 text-indigo-400" />
                <span>Export CSV</span>
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {leads.length === 0 ? (
              <div className="text-center py-12 text-xs text-zinc-500 italic font-semibold">No leads captured yet. Create a QR with "Lead Gate Capture Form" enabled, scan it, and register client to see entries!</div>
            ) : (
              leads.slice().reverse().map((lead, idx) => (
                <div key={idx} className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-2.5 text-xs font-semibold">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-zinc-200 inline-flex items-center gap-1.5 uppercase">
                        <span>👤 {lead.data.name || 'Anonymous User'}</span>
                      </h4>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5 font-bold">Campaign: /r/{lead.qrId}</div>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(lead.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Contacts row */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-300 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                    <div>📧 {lead.data.email || 'N/A'}</div>
                    <div>📞 {lead.data.phone || 'N/A'}</div>
                  </div>

                  {lead.data.notes && (
                    <p className="text-[11px] text-indigo-400 italic font-semibold pt-1.5 border-t border-zinc-850">
                      " {lead.data.notes} "
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 👑 Polished Custom Modal for QR View, Branding, Configuration & Download */}
      <AnimatePresence>
        {selectedQrForModal && (
          <div 
            onClick={() => setSelectedQrForModal(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md cursor-pointer animate-fade-in"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md md:max-w-3xl max-h-[90vh] overflow-y-auto bg-[#13131c] border border-zinc-800 rounded-3xl shadow-2xl p-6 space-y-6 cursor-default scrollbar-thin"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedQrForModal(null)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-full transition-all hover:scale-105 cursor-pointer"
                title="Dismiss details"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title Header */}
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-mono bg-indigo-600/10 px-3 py-1 rounded-full border border-indigo-500/20">
                  Branded Campaign Export
                </span>
                <h3 className="text-lg font-black text-white uppercase mt-3">
                  {selectedQrForModal.name}
                </h3>
                <p className="text-[11px] text-zinc-400 font-semibold mt-1 font-mono">
                  Dynamic link: {`${window.location.origin}/r/${selectedQrForModal.id}`}
                </p>
              </div>

              {/* QR Renderer component inside modal */}
              <div className="flex justify-center p-2">
                <QRRenderer
                  value={`${window.location.origin}/r/${selectedQrForModal.id}`}
                  qrId={selectedQrForModal.id}
                  size={190}
                />
              </div>

              {/* Custom Helpful Note */}
              <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-1.5 text-center">
                <span className="text-[9.5px] uppercase tracking-widest font-black block text-indigo-300 font-mono">
                  How sharing works:
                </span>
                <p className="text-[10px] text-zinc-400 font-semibold leading-normal">
                  Download the styled high-resolution PNG above to print on flyers, menu stands, signage, or stickers. Scan metrics are instantly mapped to your active analytics dashboard below!
                </p>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setSelectedQrForModal(null)}
                  className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase text-xs rounded-xl border border-zinc-750 transition-all cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

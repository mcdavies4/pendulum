import { ArrowRight, QrCode, Sparkles, BarChart3, Users, Zap, ChevronRight, CheckCircle2, RefreshCw, ClipboardList, Calendar, Layers, ShieldCheck, Mail } from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onEnterSandbox: () => void;
  onOpenAuth: () => void;
  userEmail: string | null;
}

export default function LandingPage({ onEnterSandbox, onOpenAuth, userEmail }: LandingPageProps) {
  const steps = [
    {
      num: '01',
      title: 'Generate Shortcode',
      desc: 'Create secure, highly readable short-routing QR codes branded to your campaign vertical.',
    },
    {
      num: '02',
      title: 'Print or Display',
      desc: 'Deploy high-contrast matrix QR codes on physical flyers, menus, yard signs, or posters.',
    },
    {
      num: '03',
      title: 'Instant Route Swap',
      desc: 'Underlying landing pages or menus changed? Redirect scanners instantly without re-printing anything.',
    },
    {
      num: '04',
      title: 'Collect Leads & AI Optimize',
      desc: 'Filter traffic with customizable lead gates and let Gemini optimize your URLs and copy for high conversion.',
    },
  ];

  const features = [
    {
      icon: RefreshCw,
      title: 'Zero Re-print Loss',
      desc: 'Printed 10,000 brochures but the URL has an error? Swap the destination live in 1 second with no physical costs.',
      badge: 'Dynamic Link',
    },
    {
      icon: BarChart3,
      title: 'Advanced Scan Telemetry',
      desc: 'Gain offline intelligence with instant user-agent processing, device type categorization, and high-fidelity timeline graphs.',
      badge: 'Real-time',
    },
    {
      icon: ClipboardList,
      title: 'Smart Contact Captures',
      desc: 'Block direct access with custom-built lead gates. Require email, phone, or name verification to unlock catalogs or downloads.',
      badge: 'Leads Engine',
    },
    {
      icon: Sparkles,
      title: 'Gemini AI Optimization',
      desc: 'Let integrated Gemini services audit your target URLs, suggest alternative marketing copy, and generate optimized titles.',
      badge: 'AI Shield',
    },
  ];

  const verticals = [
    {
      title: 'Restaurant Menus',
      tagline: 'Editable table stand QR codes',
      icon: Layers,
      benefit: 'Ditch physical reprint costs. Swap daily specials or price matrixes instantly without changing local flyers.',
      color: 'from-amber-500/20 to-orange-500/5 hover:border-amber-500/50',
      iconColor: 'text-amber-400',
    },
    {
      title: 'Real Estate Yard Signs',
      tagline: 'Instant property brochure gates',
      icon: ClipboardList,
      benefit: 'Let yard inspectors view the brochure. Capture verified email and phone coordinates before redirecting them.',
      color: 'from-emerald-500/20 to-teal-500/5 hover:border-emerald-500/50',
      iconColor: 'text-emerald-400',
    },
    {
      title: 'Event & Music Flyers',
      tagline: 'Dynamic concerts locator',
      icon: Calendar,
      benefit: 'Update ticket purchase addresses instantly. Redirect viewers to seating charts or rain-delay calendar updates.',
      color: 'from-purple-500/20 to-indigo-500/5 hover:border-purple-500/50',
      iconColor: 'text-purple-400',
    },
  ];

  return (
    <div className="relative overflow-hidden selection:bg-indigo-500/30 selection:text-white">
      {/* Decorative ambient blurred backgrounds */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[600px] right-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 left-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Promo banner */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-full text-[11px] font-mono tracking-wider uppercase font-semibold mx-auto lg:mx-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              Empowering Offline Marketing Networks
            </motion.div>

            {/* Title */}
            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 font-sans"
            >
              Dynamic Short Routing.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-500 to-cyan-400">
                Zero Re-Print Waste.
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium"
            >
              Pendulum links your physical print marketing directly to clean cloud coordinates. 
              Deploy QR codes on posters, table stands, and signposts. Swap target redirects instantly, 
              gather leads via built-in conversion gates, and track real-time scans on a stunning developer-first dashboard.
            </motion.p>

            {/* Hero CTAs */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4"
            >
              <button
                onClick={onEnterSandbox}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-blue-600 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 group transition-all transform hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
              >
                {userEmail ? 'Open App Dashboard' : 'Launch Live Sandbox'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {!userEmail && (
                <button
                  onClick={onOpenAuth}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Create Secure Account
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>
              )}
            </motion.div>

            {/* Quick trust metrics */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pt-6 grid grid-cols-3 gap-4 border-t border-zinc-900 max-w-md mx-auto lg:mx-0 text-left font-mono"
            >
              <div>
                <p className="text-xl font-bold font-sans text-white">100%</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Dynamic Capability</p>
              </div>
              <div>
                <p className="text-xl font-bold font-sans text-emerald-400">&lt; 10ms</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Redirect Latency</p>
              </div>
              <div>
                <p className="text-xl font-bold font-sans text-indigo-400">Full</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Lead Collection</p>
              </div>
            </motion.div>
          </div>

          {/* Interactive Preview Dashboard Widget Graphic */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="lg:col-span-5 relative mt-6 lg:mt-0"
          >
            <div className="relative p-1 bg-gradient-to-tr from-indigo-500/40 via-blue-600/20 to-purple-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/10">
              <div className="bg-[#100f16] rounded-[22px] p-6 space-y-6">
                {/* Visual interface header mockup */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/60" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <span className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase font-black uppercase tracking-widest">
                    Live Simulator Output
                  </span>
                </div>

                {/* Dashboard Stats Cards */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="p-4 bg-[#14141d] rounded-2xl border border-zinc-950">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Scans logged</p>
                      <span className="p-1 rounded bg-indigo-500/10 text-indigo-400"><QrCode className="w-3.5 h-3.5" /></span>
                    </div>
                    <p className="text-2xl font-black text-white mt-1">14,208</p>
                    <span className="text-[9px] text-emerald-400 font-mono font-bold">+28% this week</span>
                  </div>

                  <div className="p-4 bg-[#14141d] rounded-2xl border border-zinc-950 animate-pulse-slow">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Leads captured</p>
                      <span className="p-1 rounded bg-emerald-500/10 text-emerald-400"><Users className="w-3.5 h-3.5" /></span>
                    </div>
                    <p className="text-2xl font-black text-white mt-1">849</p>
                    <span className="text-[9px] text-indigo-400 font-mono font-bold">6.1% conv. rate</span>
                  </div>
                </div>

                {/* Simulated Campaign Link Row */}
                <div className="p-4 bg-[#14141d] rounded-2xl border border-zinc-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase">Table Menu Flyer QR</h4>
                      <p className="text-[10px] text-zinc-500 font-mono">ID: qr_9901xle</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Restaurant
                    </span>
                  </div>

                  <div className="text-[11px] space-y-1.5 pt-1">
                    <div className="flex justify-between text-zinc-500">
                      <span>Shortcode Code Address:</span>
                      <strong className="text-indigo-400 font-mono">/q/table4</strong>
                    </div>

                    <div className="flex flex-col gap-1 pt-1.5 border-t border-zinc-900">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span>Target Routing (Instant Swap Target):</span>
                        <span className="font-mono text-emerald-400 text-right truncate max-w-[150px]">
                          https://example.com/specials-june
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 text-left italic">
                        "Swap target anywhere, anytime without printing a single new table plate!"
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct Console Entry Call */}
                <div 
                  className="p-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between cursor-pointer group hover:border-zinc-700 transition-all"
                  onClick={onEnterSandbox}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                      Access Workspace Sandbox Inside
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="bg-zinc-950/40 border-y border-zinc-900/60 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black font-sans leading-tight text-white uppercase tracking-tight">
              Built for Physical Marketing & Swift Link Control
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium">
              Offline campaigns have historically been frozen in ink. Pendulum frees your prints by making the underlying targets fully fluid, trackable, and dynamic.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -4 }}
                className="p-5 bg-[#12121b] border border-zinc-900 hover:border-zinc-800 rounded-2xl relative overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-4.5">
                  <div className="flex justify-between items-start">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                      <feat.icon className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded text-[8px] font-mono tracking-wider text-zinc-400 bg-zinc-900 border border-zinc-800 uppercase font-black">
                      {feat.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wide">{feat.title}</h3>
                    <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed font-semibold">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Verticals Showcase */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <span className="px-2.5 py-0.5 text-[10px] font-mono tracking-widest text-[#a1a1aa] bg-zinc-900/60 rounded-full border border-zinc-800 uppercase font-black inline-block">
              Tailored Layouts
            </span>
            <h2 className="text-3xl font-black font-sans leading-tight text-white uppercase">
              Curated Verticals for Instant Conversions
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-semibold">
              Different prints serve different purposes. Pendulum detects scanning intent and configures gorgeous responsive views specifically for each business use case.
            </p>
            <div className="space-y-4 pt-2">
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-550/20 flex items-center justify-center shrink-0 border border-indigo-400/30">
                  <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Full-Device Responsive Sceneries</h4>
                  <p className="text-[10px] text-zinc-500">Every template adjusts dynamically from mobile screens to heavy display kiosks.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-550/20 flex items-center justify-center shrink-0 border border-indigo-400/30">
                  <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Interactive Leads Dashboard</h4>
                  <p className="text-[10px] text-zinc-500">Contacts are parsed instantly and structured cleanly for secure CSV downloads.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {verticals.map((vert, idx) => (
              <div 
                key={idx}
                className={`p-6 bg-gradient-to-br ${vert.color} border border-zinc-900 rounded-2xl transition-all hover:scale-[1.01] duration-300 flex flex-col justify-between space-y-6`}
              >
                <div className="space-y-3">
                  <div className={`p-2.5 rounded-xl bg-zinc-950/60 ${vert.iconColor} w-max border border-zinc-800`}>
                    <vert.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wide">{vert.title}</h3>
                    <p className="text-[10px] text-zinc-500 font-mono tracking-wide mt-0.5">{vert.tagline}</p>
                  </div>
                  <p className="text-[11px] text-zinc-350 leading-relaxed pt-1 font-semibold">
                    {vert.benefit}
                  </p>
                </div>
              </div>
            ))}
            
            {/* CTA card block inside bento */}
            <div 
              onClick={onEnterSandbox}
              className="p-6 bg-[#13121d] border border-dashed border-indigo-500/30 hover:border-indigo-500/70 rounded-2xl flex flex-col justify-center items-center text-center space-y-4 group cursor-pointer transition-all"
            >
              <QrCode className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-xs font-black uppercase text-white">And many more</h4>
                <p className="text-[10px] text-zinc-500 mt-1">General Business, Event flyers, custom shortcodes, WiFi, and deep link chains.</p>
              </div>
              <span className="text-[10px] font-black uppercase text-indigo-400 flex items-center gap-1">
                Enter Sandbox Live <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Step Flow */}
      <section className="bg-zinc-950/40 border-t border-zinc-900/60 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-mono uppercase text-indigo-400 font-black tracking-widest">Simplifying Physical Tech Deployment</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">How Pendulum Keeps Prints Synchronized</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => (
              <div key={idx} className="p-6 bg-zinc-900/10 border border-zinc-900/50 rounded-2xl relative space-y-4">
                <span className="text-3xl font-black text-indigo-500/25 font-mono absolute top-4 right-5 select-none">{step.num}</span>
                <h3 className="text-xs font-bold uppercase text-white pr-8">{step.title}</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-semibold">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Launch Portal CTA Splash */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="relative p-8 md:p-14 bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-zinc-950/20 border border-indigo-500/20 rounded-3xl overflow-hidden text-center space-y-6">
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          <QrCode className="w-12 h-12 text-indigo-400 mx-auto animate-pulse-slow" />
          <div className="space-y-2">
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white">
              Ready to Upgrade Your Real Physical Assets?
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed font-semibold">
              Join marketing specialists, restaurant owners, concert organizers, and realtors securing their physical flyer fleets today.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-3 max-w-md mx-auto">
            <button
              onClick={onEnterSandbox}
              className="w-full sm:w-auto px-10 py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-650 to-blue-600 hover:from-indigo-600 text-white font-black text-xs uppercase tracking-wider transition-all transform hover:scale-[1.01] active:scale-[0.98] shadow-lg shadow-indigo-600/10 cursor-pointer"
            >
              Launch Platform Workspace
            </button>
            {!userEmail && (
              <button
                onClick={onOpenAuth}
                className="w-full sm:w-auto px-6 py-4 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

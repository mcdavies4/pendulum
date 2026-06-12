import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Copy, Check, Palette, LayoutGrid, Type, Sparkles, HelpCircle } from 'lucide-react';

interface QRProps {
  value: string; // The URL to encode (e.g. http://localhost:3000/r/abc)
  qrId: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  minimal?: boolean;
}

export default function QRRenderer({ value, qrId, size = 180, fgColor: initialFg = '#09090b', bgColor: initialBg = '#ffffff', minimal = false }: QRProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [colorPreset, setColorPreset] = useState<'classic' | 'navy' | 'forest' | 'sunset' | 'corporate' | 'custom'>('classic');
  const [fgColor, setFgColor] = useState(initialFg);
  const [bgColor, setBgColor] = useState(initialBg);
  const [margin, setMargin] = useState(2);
  const [downloading, setDownloading] = useState(false);
  
  // Custom Writing / Instructions / Designs State
  const [ctaFrame, setCtaFrame] = useState<'none' | 'minimal' | 'dark' | 'light' | 'colored'>('dark');
  const [ctaText, setCtaText] = useState('SCAN ME');
  const [ctaSubtext, setCtaSubtext] = useState('SCAN WITH SMARTPHONE CAMERA');

  // Interactive quick templates helper
  const CTA_TEMPLATES = [
    { text: 'SCAN ME', sub: 'SCAN WITH SMARTPHONE CAMERA' },
    { text: 'VIEW MENU', sub: 'SCAN FOR OFFERS & WEEKLY PRICING' },
    { text: 'TAP TO CONNECT', sub: 'SECURE AUTOMATED CAMPAIGN ROUTE' },
    { text: 'WIN DISCOUNTS', sub: 'INPUT LEAD DETAILS TO CLAIM OFFERS' },
    { text: 'FLYER EVENT', sub: 'PREVIEW LOCATION & MAP DIRECTIONS' },
  ];

  // Apply color presets
  useEffect(() => {
    switch (colorPreset) {
      case 'classic':
        setFgColor('#09090b'); // Off-black
        setBgColor('#ffffff'); // Pure white
        break;
      case 'navy':
        setFgColor('#1e1b4b'); // Deep Navy
        setBgColor('#3b82f6'); // Cool blue
        break;
      case 'forest':
        setFgColor('#022c22'); // Forest Green
        setBgColor('#10b981'); // Emerald
        break;
      case 'sunset':
        setFgColor('#451a03'); // Dark Rust
        setBgColor('#f97316'); // Vibrant Orange
        break;
      case 'corporate':
        setFgColor('#2e1065'); // Deep Violet
        setBgColor('#8b5cf6'); // Violet Purple
        break;
      case 'custom':
        // Keep active custom pick colors
        break;
    }
  }, [colorPreset]);

  // Redraw QR code when value, colors, or margin changes
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: margin,
          color: {
            dark: fgColor,
            light: bgColor.startsWith('#') ? bgColor : '#ffffff',
          },
          errorCorrectionLevel: 'Q',
        },
        (error) => {
          if (error) console.error('Error generating QR Canvas', error);
        }
      );
    }
  }, [value, size, fgColor, bgColor, margin]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    setDownloading(true);
    try {
      if (ctaFrame === 'none') {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `pendulum_qr_${qrId}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Create offscreen high-res composition frame
        const offscreen = document.createElement('canvas');
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          const qrSize = canvasRef.current.width;
          const paddingX = 40;
          const paddingTop = 40;
          const paddingBottom = 90;

          offscreen.width = qrSize + paddingX * 2;
          offscreen.height = qrSize + paddingTop + paddingBottom;

          // Render background frame base
          if (ctaFrame === 'dark') {
            ctx.fillStyle = '#0a0a0c'; // Elegant dark card matching dark preview
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(0, 0, offscreen.width, offscreen.height, 24);
            else ctx.rect(0, 0, offscreen.width, offscreen.height);
            ctx.fill();

            // Symmetrical neon border using branding accent or indigo
            ctx.strokeStyle = fgColor || '#6366f1';
            ctx.lineWidth = 4;
            ctx.stroke();
          } else if (ctaFrame === 'light') {
            ctx.fillStyle = '#ffffff'; // White paper clean slate
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(0, 0, offscreen.width, offscreen.height, 24);
            else ctx.rect(0, 0, offscreen.width, offscreen.height);
            ctx.fill();

            ctx.strokeStyle = '#e4e4e7'; // zinc-200 border
            ctx.lineWidth = 4;
            ctx.stroke();
          } else if (ctaFrame === 'colored') {
            ctx.fillStyle = bgColor || '#4f46e5'; // solid custom/brand bg color
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(0, 0, offscreen.width, offscreen.height, 24);
            else ctx.rect(0, 0, offscreen.width, offscreen.height);
            ctx.fill();

            ctx.strokeStyle = fgColor || '#ffffff';
            ctx.lineWidth = 4;
            ctx.stroke();
          } else if (ctaFrame === 'minimal') {
            // For scanner support we force a full clean white quiet banner wrapping the layout
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(0, 0, offscreen.width, offscreen.height, 16);
            else ctx.rect(0, 0, offscreen.width, offscreen.height);
            ctx.fill();

            ctx.strokeStyle = '#f4f4f5'; // zinc-100 subtle line
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Draw contrasting QR bounding container
          if (ctaFrame === 'dark' || ctaFrame === 'colored') {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(paddingX - 12, paddingTop - 12, qrSize + 24, qrSize + 24, 16);
            } else {
              ctx.rect(paddingX - 12, paddingTop - 12, qrSize + 24, qrSize + 24);
            }
            ctx.fill();
          }

          // Render QR code
          ctx.drawImage(canvasRef.current, paddingX, paddingTop);

          // Render the custom titles
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          let textPrimary = '#ffffff';
          let textSecondary = '#9ca3af';

          if (ctaFrame === 'light' || ctaFrame === 'minimal') {
            textPrimary = '#0f172a'; // slate-900
            textSecondary = '#475569'; // slate-600
          } else if (ctaFrame === 'colored') {
            textPrimary = fgColor || '#ffffff';
            textSecondary = fgColor || '#ffffff';
          }

          // Title
          ctx.font = 'bold 18/1.2 sans-serif';
          ctx.fillStyle = textPrimary;
          ctx.fillText((ctaText || 'SCAN ME').toUpperCase(), offscreen.width / 2, qrSize + paddingTop + 34);

          // Instruction Subtext
          ctx.font = '9px monospace';
          ctx.fillStyle = textSecondary;
          if (ctaFrame === 'colored') {
            ctx.globalAlpha = 0.85;
          }
          ctx.fillText((ctaSubtext || 'SCAN WITH SMARTPHONE CAMERA').toUpperCase(), offscreen.width / 2, qrSize + paddingTop + 58);
          ctx.globalAlpha = 1.0;

          // Save composition
          const dataUrl = offscreen.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `pendulum_styled_qr_${qrId}.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (err) {
      console.error('Error downloading QR code image', err);
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
  };

  if (minimal) {
    return (
      <div id={`qr-card-minimal-${qrId}`} className="block">
        <div className="relative p-1.5 bg-white rounded-lg border border-zinc-800 shadow-sm flex items-center justify-center">
          <canvas ref={canvasRef} className="rounded" style={{ width: `${size}px`, height: `${size}px` }} />
        </div>
      </div>
    );
  }

  // Determine dynamic styles for preview card rendered on screen
  const getPreviewCardStyle = () => {
    switch (ctaFrame) {
      case 'none':
        return 'bg-white/95 border border-zinc-800/60 p-4 rounded-xl shadow-inner';
      case 'minimal':
        return 'bg-white border border-zinc-200/80 p-4 rounded-2xl flex flex-col items-center shadow-md';
      case 'light':
        return 'bg-white border-2 border-zinc-250/90 p-5 rounded-2xl flex flex-col items-center shadow-md';
      case 'colored':
        return 'border-3 rounded-2xl p-5 flex flex-col items-center shadow-lg transition-all duration-300';
      case 'dark':
      default:
        return 'bg-[#0a0a0c] border-2 rounded-2xl p-5 flex flex-col items-center shadow-2xl transition-all duration-300';
    }
  };

  return (
    <div id={`qr-card-${qrId}`} className="flex flex-col xl:flex-row xl:items-start xl:gap-8 w-full items-stretch bg-zinc-900/60 border border-zinc-805/85 rounded-3xl p-5 sm:p-6 hover:border-zinc-800/80 transition-all shadow-xl">
      
      {/* COLUMN 1: Live Render Visual Preview Stage */}
      <div className="flex flex-col items-center space-y-5 shrink-0 w-full xl:w-auto">
        <div className="text-center w-full">
          <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-indigo-400">Live Campaign Artwork</span>
          <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">Realpiece simulator of final printed media stickers</p>
        </div>

        {/* Live Simulator Viewport */}
        <div 
          className={getPreviewCardStyle()}
          style={
            ctaFrame === 'colored' 
              ? { backgroundColor: bgColor, borderColor: fgColor } 
              : ctaFrame === 'dark'
                ? { borderColor: fgColor }
                : {}
          }
        >
          {/* Inner QR container */}
          <div className={`p-3 bg-white rounded-xl flex items-center justify-center shadow-inner ${
            ctaFrame === 'light' ? 'border border-zinc-100' : ''
          }`}>
            <canvas ref={canvasRef} className="rounded max-w-full" style={{ width: `${size}px`, height: `${size}px` }} />
          </div>

          {/* Slogan details rendering */}
          {ctaFrame !== 'none' && (
            <div className="text-center mt-3 px-1 max-w-[200px] break-words">
              <span className={`font-black uppercase text-xs tracking-wider block leading-snug ${
                ctaFrame === 'light' || ctaFrame === 'minimal' 
                  ? 'text-zinc-900' 
                  : ctaFrame === 'colored'
                    ? 'text-white'
                    : 'text-white'
              }`}
              style={ctaFrame === 'colored' ? { color: fgColor } : {}}
              >
                {ctaText || 'SCAN ME'}
              </span>
              <span className={`font-mono text-[9px] block mt-1 tracking-tight leading-normal uppercase ${
                ctaFrame === 'light' || ctaFrame === 'minimal'
                  ? 'text-[#475569]'
                  : ctaFrame === 'colored'
                    ? 'text-white/85'
                    : 'text-[#9ca3af]'
              }`}
              style={ctaFrame === 'colored' ? { color: fgColor, opacity: 0.85 } : {}}
              >
                {ctaSubtext || 'SCAN WITH SMARTPHONE CAMERA'}
              </span>
            </div>
          )}
        </div>

        {/* Action Triggers Grid */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            id={`btn-copy-desk-${qrId}`}
            onClick={handleCopyLink}
            type="button"
            className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold rounded-xl bg-zinc-950 text-zinc-300 border border-zinc-850 hover:bg-zinc-900 transition-all cursor-pointer select-none active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 font-mono">Copied Url!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Copy Short URL</span>
              </>
            )}
          </button>

          <button
            id={`btn-download-desk-${qrId}`}
            onClick={handleDownload}
            type="button"
            disabled={downloading}
            className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer disabled:opacity-50 border-none shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 select-none"
          >
            <Download className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            <span>{downloading ? 'Composing...' : 'Download PNG'}</span>
          </button>
        </div>
      </div>

      {/* COLUMN 2: Branded Configuration Console */}
      <div className="w-full mt-6 xl:mt-0 flex-1 space-y-4.5">
        
        {/* DESIGN LAYOUT SELECTOR */}
        <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
            <LayoutGrid className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Printed Frame Designs</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-2">
            {[
              { id: 'none', label: 'Raw Grid Only', desc: 'Plain QR mesh' },
              { id: 'minimal', label: 'Minimal Labeled', desc: 'No heavy borders' },
              { id: 'dark', label: 'Midnight Elegant', desc: 'Slate card outline' },
              { id: 'light', label: 'Clean Paper', desc: 'Light high contrast' },
              { id: 'colored', label: 'Brand Color Banner', desc: 'Full custom solid' },
            ].map((frm) => (
              <button
                key={frm.id}
                type="button"
                onClick={() => setCtaFrame(frm.id as any)}
                className={`py-2 px-3 text-left rounded-xl border transition-all cursor-pointer select-none ${
                  ctaFrame === frm.id
                    ? 'bg-indigo-600/15 border-indigo-550 text-indigo-300'
                    : 'bg-[#121019]/40 border-zinc-850 hover:border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="text-[10.5px] font-black uppercase tracking-wider">{frm.label}</div>
                <div className="text-[8px] text-zinc-500 font-semibold mt-0.5 truncate">{frm.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* TEXTS AND CTAs INSTRUCTIONS WRITING FORM */}
        {ctaFrame !== 'none' && (
          <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Type className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Text Instructions & CTAs</span>
              </div>
              <span className="text-[8.5px] font-mono text-zinc-500 font-bold uppercase">Dynamic print routing</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-400 mb-1 text-left font-bold">
                  Top CTA Header text (Max 22 char)
                </label>
                <input
                  type="text"
                  maxLength={22}
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="e.g. SCAN ME"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs font-semibold placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-400 mb-1 text-left font-bold">
                  Bottom Instruction Subtext
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={ctaSubtext}
                  onChange={(e) => setCtaSubtext(e.target.value)}
                  placeholder="e.g. SCAN FOR OFFER & DISCOUNT CARD"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs font-semibold placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>
            </div>

            {/* Quick Presets tags */}
            <div className="space-y-1.5">
              <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 text-left font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Use Print templates helper:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CTA_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCtaText(tmpl.text);
                      setCtaSubtext(tmpl.sub);
                    }}
                    className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 rounded-md text-[9px] text-zinc-400 hover:text-zinc-300 font-bold transition-all cursor-pointer select-none"
                  >
                    "{tmpl.text}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BRAND PRESET AND CUSTOM CHANNELS PICKER */}
        <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
            <Palette className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Premium Brand Presets & Colors</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'classic', label: 'Black/White', color: 'bg-zinc-800' },
              { id: 'navy', label: 'Ocean Blue', color: 'bg-blue-600' },
              { id: 'forest', label: 'Vibrant Green', color: 'bg-emerald-500' },
              { id: 'sunset', label: 'Dusk Orange', color: 'bg-amber-600' },
              { id: 'corporate', label: 'Deep Purple', color: 'bg-indigo-600' },
              { id: 'custom', label: 'Custom Brand Hex', color: 'bg-gradient-to-r from-red-400 via-green-400 to-blue-400' },
            ].map((preset) => (
              <button
                key={preset.id}
                id={`preset-${preset.id}`}
                onClick={() => setColorPreset(preset.id as any)}
                type="button"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10.5px] font-bold rounded-xl border transition-all cursor-pointer ${
                  colorPreset === preset.id
                    ? 'bg-indigo-600 border-indigo-505 text-white'
                    : 'bg-[#121019]/40 border-zinc-850 hover:border-zinc-800 text-zinc-400'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${preset.color} border border-white/20 shrink-0`} />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          {/* Color pickers: show when preset is custom */}
          {colorPreset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#110e1a]/80 border border-zinc-850 rounded-xl animate-fade-in text-left">
              <div>
                <label className="block text-[8.5px] font-mono uppercase text-zinc-400 font-bold mb-1">Foreground Color</label>
                <div className="flex items-center gap-1.5">
                  <input 
                    type="color" 
                    value={fgColor} 
                    onChange={(e) => setFgColor(e.target.value)} 
                    className="w-7 h-7 bg-transparent border-none rounded cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={fgColor} 
                    onChange={(e) => setFgColor(e.target.value)} 
                    className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 w-full focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[8.5px] font-mono uppercase text-zinc-400 font-bold mb-1">Background Color</label>
                <div className="flex items-center gap-1.5">
                  <input 
                    type="color" 
                    value={bgColor} 
                    onChange={(e) => setBgColor(e.target.value)} 
                    className="w-7 h-7 bg-transparent border-none rounded cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={bgColor} 
                    onChange={(e) => setBgColor(e.target.value)} 
                    className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 w-full focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quiet space margins picker slider */}
          <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-400">
            <span className="font-semibold">Quiet Margin spacing size:</span>
            <div className="flex items-center gap-2 font-mono font-bold text-zinc-300">
              <button
                type="button"
                onClick={() => setMargin(Math.max(1, margin - 1))}
                className="w-5 h-5 flex items-center justify-center bg-zinc-900 hover:bg-zinc-850 rounded-lg border border-zinc-800 cursor-pointer text-xs font-bold font-sans"
              >
                -
              </button>
              <span className="w-4 text-center">{margin}px</span>
              <button
                type="button"
                onClick={() => setMargin(Math.min(8, margin + 1))}
                className="w-5 h-5 flex items-center justify-center bg-zinc-900 hover:bg-zinc-850 rounded-lg border border-zinc-805 cursor-pointer text-xs font-bold font-sans"
              >
                +
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

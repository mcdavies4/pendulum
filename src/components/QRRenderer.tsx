import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Copy, Check, Palette, LayoutGrid } from 'lucide-react';

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
  const [colorPreset, setColorPreset] = useState<'classic' | 'navy' | 'forest' | 'sunset' | 'corporate'>('classic');
  const [fgColor, setFgColor] = useState(initialFg);
  const [bgColor, setBgColor] = useState(initialBg);
  const [margin, setMargin] = useState(2);
  const [downloading, setDownloading] = useState(false);
  const [ctaFrame, setCtaFrame] = useState<'none' | 'scan_me' | 'menu' | 'retro' | 'badge'>('none');

  // Apply color presets
  useEffect(() => {
    switch (colorPreset) {
      case 'classic':
        setFgColor('#09090b'); // Off-black
        setBgColor('#ffffff'); // Pure white
        break;
      case 'navy':
        setFgColor('#111827'); // Deep dark
        setBgColor('#3b82f6'); // Cool blue
        break;
      case 'forest':
        setFgColor('#064e3b'); // Emerald deep
        setBgColor('#f0fdf4'); // Green 50
        break;
      case 'sunset':
        setFgColor('#7c2d12'); // Rust orange
        setBgColor('#fff7ed'); // Orange 50
        break;
      case 'corporate':
        setFgColor('#4c1d95'); // Violet deep
        setBgColor('#f5f3ff'); // Violet 50
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

          // Draw the background frame matching the dark theme of the design
          ctx.fillStyle = '#1c1917'; // Elegant warm off-black background 
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(0, 0, offscreen.width, offscreen.height, 24);
          } else {
            ctx.rect(0, 0, offscreen.width, offscreen.height);
          }
          ctx.fill();

          // Draw neon dynamic frame border
          ctx.strokeStyle = '#6366f1'; // Indigo neon border
          ctx.lineWidth = 3;
          ctx.stroke();

          // Draw card white space background block for QR code contrast
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(paddingX - 12, paddingTop - 12, qrSize + 24, qrSize + 24, 16);
          } else {
            ctx.rect(paddingX - 12, paddingTop - 12, qrSize + 24, qrSize + 24);
          }
          ctx.fill();

          // Draw the QR Code inside the card
          ctx.drawImage(canvasRef.current, paddingX, paddingTop);

          // Render high-fidelity Typography titles
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          let mainText = 'SCAN ME';
          let subText = 'SCAN WITH SMARTPHONE CAMERA';

          if (ctaFrame === 'scan_me') {
            mainText = 'SCAN ME';
            subText = 'TO LAUNCH DYNAMIC CAMPAIGN';
          } else if (ctaFrame === 'menu') {
            mainText = 'VIEW DIGITAL MENU';
            subText = 'SCAN FOR SPECIAL OFFERS & PRICES';
          } else if (ctaFrame === 'retro') {
            mainText = 'TAP & EXPLORE';
            subText = 'POWERED BY PENDULUM ROUTING';
          } else if (ctaFrame === 'badge') {
            mainText = 'VISIT ONLINE PORTAL';
            subText = 'SECURE REALTIME SCAN CAPTURE';
          }

          // Main text drawing with high visibility
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText(mainText, offscreen.width / 2, qrSize + paddingTop + 32);

          // Subtext drawing
          ctx.font = '9px monospace';
          ctx.fillStyle = '#a1a1aa'; // Muted dark text
          ctx.fillText(subText, offscreen.width / 2, qrSize + paddingTop + 55);

          const dataUrl = offscreen.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `pendulum_framed_qr_${qrId}.png`;
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

  return (
    <div id={`qr-card-${qrId}`} className="flex flex-col md:flex-row md:items-start md:gap-6 w-full items-center bg-zinc-900/50 border border-zinc-805/80 rounded-2xl p-4 sm:p-5 hover:border-zinc-800 transition-all shadow-premium">
      {/* Visual Canvas Panel Column */}
      <div className="flex flex-col items-center space-y-4 shrink-0 w-full md:w-auto">
        <div className="relative group p-4 bg-white rounded-xl border border-zinc-800 shadow-inner flex items-center justify-center w-max mx-auto">
          <canvas ref={canvasRef} className="rounded-lg max-w-full" style={{ width: `${size}px`, height: `${size}px` }} />
          <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950/90 backdrop-blur-md text-white text-[10px] py-1 px-2 rounded-lg font-mono pointer-events-none border border-zinc-800">
            <span>High-Res PNG</span>
          </div>
        </div>

        {/* Action Triggers Grid - Desktop Screen Spec */}
        <div className="hidden md:grid grid-cols-2 gap-2.5 w-full">
          <button
            id={`btn-copy-desk-${qrId}`}
            onClick={handleCopyLink}
            type="button"
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl bg-zinc-950 text-zinc-300 border border-zinc-850 hover:bg-zinc-900 transition-all cursor-pointer whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 font-mono">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Copy URL</span>
              </>
            )}
          </button>

          <button
            id={`btn-download-desk-${qrId}`}
            onClick={handleDownload}
            type="button"
            disabled={downloading}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl bg-indigo-650 hover:bg-indigo-500 text-white transition-all cursor-pointer disabled:opacity-50 border-none shadow-premium shadow-indigo-505/10 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{downloading ? 'Saving...' : 'Download'}</span>
          </button>
        </div>
      </div>

      {/* Configuration Customizations Panel Column */}
      <div className="w-full mt-5 md:mt-0 space-y-4 flex-1">
        {/* Style Preset Customization - Paid Hook! */}
        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 mb-2.5">
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span>Premium QR Branding Presets</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'classic', label: 'Classic', color: 'bg-zinc-900' },
              { id: 'navy', label: 'Navy Blue', color: 'bg-blue-600' },
              { id: 'forest', label: 'Forest', color: 'bg-emerald-800' },
              { id: 'sunset', label: 'Sunset', color: 'bg-amber-700' },
              { id: 'corporate', label: 'Indigo', color: 'bg-indigo-750' },
            ].map((preset) => (
              <button
                key={preset.id}
                id={`preset-${preset.id}`}
                onClick={() => setColorPreset(preset.id as any)}
                type="button"
                className={`flex items-center gap-1.5 px-2 py-1 text-[10.5px] font-semibold rounded-lg border transition-all cursor-pointer ${
                  colorPreset === preset.id
                    ? 'bg-indigo-650 border-indigo-500 text-white'
                    : 'bg-transparent border-zinc-800 hover:border-zinc-700 text-zinc-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${preset.color} border border-white/20`} />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-400">
            <span>Quiet Margin size:</span>
            <div className="flex items-center gap-2 font-mono font-bold text-zinc-300">
              <button
                type="button"
                onClick={() => setMargin(Math.max(1, margin - 1))}
                className="w-5 h-5 flex items-center justify-center bg-zinc-900 hover:bg-zinc-850 rounded-lg border border-zinc-800 cursor-pointer text-xs font-bold"
              >
                -
              </button>
              <span className="w-4 text-center">{margin}px</span>
              <button
                type="button"
                onClick={() => setMargin(Math.min(8, margin + 1))}
                className="w-5 h-5 flex items-center justify-center bg-zinc-900 hover:bg-zinc-850 rounded-lg border border-zinc-805 cursor-pointer text-xs font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Offline Flyer Frame custom wrap configuration */}
        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 mb-2.5">
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
            <span>Format Download Frame CTA</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'none', label: 'Raw Grid' },
              { id: 'scan_me', label: 'Scan Me Frame' },
              { id: 'menu', label: 'Digital Menu' },
              { id: 'retro', label: 'Dynamic Link' },
              { id: 'badge', label: 'Pro Portal' },
            ].map((frm) => (
              <button
                key={frm.id}
                type="button"
                onClick={() => setCtaFrame(frm.id as any)}
                className={`py-1.5 px-2 text-[10px] text-left rounded-lg font-bold border transition-all cursor-pointer truncate ${
                  ctaFrame === frm.id
                    ? 'bg-indigo-650 border-indigo-500 text-white'
                    : 'bg-[#13111c]/60 border-zinc-800 hover:border-zinc-750 text-zinc-400'
                }`}
              >
                {frm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action triggers - Mobile Target Display (hidden on desktops) */}
        <div className="grid md:hidden grid-cols-2 gap-3">
          <button
            id={`btn-copy-${qrId}`}
            onClick={handleCopyLink}
            type="button"
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl bg-zinc-950 text-zinc-300 border border-zinc-850 hover:bg-zinc-900 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 font-mono">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Copy URL</span>
              </>
            )}
          </button>

          <button
            id={`btn-download-${qrId}`}
            onClick={handleDownload}
            type="button"
            disabled={downloading}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl bg-indigo-650 hover:bg-indigo-500 text-white transition-all cursor-pointer disabled:opacity-50 border-none shadow-premium shadow-indigo-505/10"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{downloading ? 'Saving...' : 'Download'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import {
  Sparkles,
  BookOpen,
  Minimize2,
  Check,
  FileSpreadsheet,
  Layers,
  Palette,
} from 'lucide-react';
import { A4ReceiptTheme } from './PrintReceipt';

export type PrintTemplateStyle = 'Modern Minimal' | 'Classic Ledger' | 'Compact Statement';

export interface TemplateDefinition {
  id: A4ReceiptTheme;
  title: PrintTemplateStyle;
  tagline: string;
  badge: string;
  accentColor: string;
  icon: React.FC<{ className?: string }>;
  features: string[];
  previewSketch: React.ReactNode;
}

export const PRINT_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'modern-minimal',
    title: 'Modern Minimal',
    tagline: 'Airy typography with soft borders & contemporary badges',
    badge: 'Executive',
    accentColor: 'indigo',
    icon: Sparkles,
    features: ['Generous white-space', 'Sleek rounded pills', 'Monochrome balance chips'],
    previewSketch: (
      <div className="w-full h-20 bg-slate-900/60 rounded-md p-2 flex flex-col justify-between border border-slate-700/60 text-[8px] font-sans">
        <div className="flex justify-between items-center pb-1 border-b border-slate-700/60">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <span className="font-bold text-slate-200">raBooks</span>
          </div>
          <span className="px-1 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">
            RECEIPT
          </span>
        </div>
        <div className="flex justify-between items-center py-1">
          <div className="space-y-0.5">
            <div className="w-12 h-1 bg-slate-600 rounded" />
            <div className="w-8 h-1 bg-slate-700 rounded" />
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-indigo-300 text-[10px]">₹12,500</span>
          </div>
        </div>
        <div className="flex gap-1 pt-1 border-t border-slate-800">
          <div className="w-1/3 h-1 bg-slate-700 rounded" />
          <div className="w-1/3 h-1 bg-slate-700 rounded" />
          <div className="w-1/3 h-1 bg-indigo-500/40 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'classic-ledger',
    title: 'Classic Ledger',
    tagline: 'Formal double-entry accounting with crisp columnar ruling',
    badge: 'Auditor Standard',
    accentColor: 'amber',
    icon: BookOpen,
    features: ['Double-underline totals', 'Columnar ledger grids', 'Formal legal headings'],
    previewSketch: (
      <div className="w-full h-20 bg-amber-950/20 rounded-md p-2 flex flex-col justify-between border border-amber-800/40 text-[8px] font-serif">
        <div className="flex justify-between items-center pb-1 border-b-2 border-amber-600/60">
          <span className="font-bold tracking-wider text-amber-200 uppercase">LEDGER ACCOUNT</span>
          <span className="font-mono text-amber-400 text-[9px]">FOLIO #42</span>
        </div>
        <div className="grid grid-cols-3 gap-1 py-0.5 border-b border-amber-800/30 text-center font-mono">
          <div className="text-slate-400">DR ₹5,000</div>
          <div className="text-slate-400">CR ₹2,000</div>
          <div className="font-bold text-amber-300">BAL ₹3,000</div>
        </div>
        <div className="flex justify-between items-center pt-0.5 border-b-2 border-amber-500/80">
          <span className="text-[7px] text-slate-400 uppercase">RECONCILED BALANCE</span>
          <span className="font-mono font-bold text-amber-300 text-[9px]">₹3,000.00</span>
        </div>
      </div>
    ),
  },
  {
    id: 'compact-statement',
    title: 'Compact Statement',
    tagline: 'High-density format optimized for single-page multi-records',
    badge: 'Eco Density',
    accentColor: 'emerald',
    icon: Minimize2,
    features: ['Maximized row capacity', 'Compressed vertical rhythm', 'Quick-scan matrix'],
    previewSketch: (
      <div className="w-full h-20 bg-emerald-950/20 rounded-md p-1.5 flex flex-col justify-between border border-emerald-800/40 text-[7px] font-sans">
        <div className="flex justify-between items-center pb-0.5 border-b border-emerald-700/50 font-bold">
          <span className="text-emerald-300">SUMMARY MATRIX</span>
          <span className="font-mono text-slate-300">32 TXNS / 1 PAGE</span>
        </div>
        <div className="space-y-0.5 font-mono">
          <div className="flex justify-between text-slate-300">
            <span>24/09 UPI-HDFC</span>
            <span className="text-rose-300">-₹2,500</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>25/09 CASH-REC</span>
            <span className="text-emerald-300">+₹8,000</span>
          </div>
        </div>
        <div className="flex justify-between items-center pt-0.5 border-t border-emerald-800/60 font-bold text-emerald-400">
          <span>NET CLOSING</span>
          <span className="font-mono">₹5,500</span>
        </div>
      </div>
    ),
  },
];

interface PrintTemplateGalleryProps {
  selectedTheme: A4ReceiptTheme;
  onSelectTheme: (theme: A4ReceiptTheme) => void;
  className?: string;
}

export const PrintTemplateGallery: React.FC<PrintTemplateGalleryProps> = ({
  selectedTheme,
  onSelectTheme,
  className = '',
}) => {
  // Map any legacy or sub-theme to the closest primary template
  const activeTemplateId =
    selectedTheme === 'classic-ledger' || selectedTheme === 'traditional-ledger' || selectedTheme === 'classic-business' || selectedTheme === 'professional-accounting'
      ? selectedTheme === 'traditional-ledger' || selectedTheme === 'classic-ledger' ? 'classic-ledger' : selectedTheme === 'classic-business' ? 'classic-ledger' : selectedTheme
      : selectedTheme === 'compact-statement' || selectedTheme === 'compact-business'
      ? 'compact-statement'
      : 'modern-minimal';

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Print Template Gallery
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Live instant rendering active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRINT_TEMPLATES.map((tmpl) => {
          const isSelected =
            selectedTheme === tmpl.id ||
            (tmpl.id === 'classic-ledger' && (selectedTheme === 'classic-business' || selectedTheme === 'traditional-ledger' || selectedTheme === 'professional-accounting')) ||
            (tmpl.id === 'compact-statement' && selectedTheme === 'compact-business') ||
            (tmpl.id === 'modern-minimal' && selectedTheme === 'clean-corporate');

          const IconComponent = tmpl.icon;

          return (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => onSelectTheme(tmpl.id)}
              className={`text-left rounded-xl p-3.5 transition-all cursor-pointer relative flex flex-col justify-between border ${
                isSelected
                  ? 'bg-slate-800/95 border-indigo-500 shadow-lg shadow-indigo-950/40 ring-2 ring-indigo-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Header with Title and Checkmark Badge */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isSelected
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {tmpl.title}
                      </h4>
                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 border border-indigo-800/60 px-1.5 py-0.2 rounded inline-block">
                        {tmpl.badge}
                      </span>
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full border border-slate-700 bg-slate-800/50 shrink-0" />
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-tight mb-2.5">
                  {tmpl.tagline}
                </p>

                {/* Interactive Visual Schematic Thumbnail */}
                <div className="mb-2.5">{tmpl.previewSketch}</div>

                {/* Bullet Highlights */}
                <ul className="space-y-1 text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                  {tmpl.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Active Selection Indicator Ribbon */}
              <div className="mt-2.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                <span className={isSelected ? 'text-indigo-300 font-semibold' : 'text-slate-500'}>
                  {isSelected ? '✓ Selected Style' : 'Click to apply'}
                </span>
                <span className="font-mono text-slate-500">A4 / Letter</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

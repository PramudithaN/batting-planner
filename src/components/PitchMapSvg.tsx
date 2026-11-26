import React from 'react';
import { LENGTHS, LINES } from '../domain/types';

interface PitchMapSvgProps {
  selectedLine?: string;
  selectedLength?: string;
  onSelect: (line: string, length: string) => void;
}

const LENGTH_ABBR: Record<string, string> = {
  'Full toss': 'FT',
  Yorker: 'YK',
  Full: 'FL',
  'Good length': 'GL',
  'Back of a length': 'BL',
  Short: 'SH',
};

const LENGTH_ACCENT: Record<string, string> = {
  'Full toss': 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30',
  Yorker: 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30',
  Full: 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30',
  'Good length': 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/30',
  'Back of a length': 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-500/30',
  Short: 'bg-slate-500/15 hover:bg-slate-500/25 border-slate-500/30',
};

export const PitchMapSvg: React.FC<PitchMapSvgProps> = ({
  selectedLine,
  selectedLength,
  onSelect,
}) => {
  return (
    <div className="ui-card-elevated p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="ui-label mb-0">1-Tap Pitch Map</span>
        <span className="rounded-md bg-[var(--bg-surface)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-primary)] ring-1 ring-[var(--border-subtle)]">
          {selectedLength && selectedLine ? `${selectedLength} · ${selectedLine}` : 'Tap zone'}
        </span>
      </div>

      {/* Batter Stumps Visual Indicator */}
      <div className="mb-1.5 flex items-center justify-center gap-1.5">
        <span className="h-1 w-8 rounded-full bg-[var(--border-strong)]" />
        <div className="flex gap-1" title="Batter Stumps">
          <span className="h-2.5 w-1 rounded-xs bg-amber-500" />
          <span className="h-2.5 w-1 rounded-xs bg-amber-500" />
          <span className="h-2.5 w-1 rounded-xs bg-amber-500" />
        </div>
        <span className="h-1 w-8 rounded-full bg-[var(--border-strong)]" />
      </div>

      <div className="grid grid-cols-6 gap-1">
        {LENGTHS.map((length) =>
          LINES.map((line) => {
            const active = selectedLine === line && selectedLength === length;
            return (
              <button
                key={`${length}-${line}`}
                type="button"
                title={`${length} · ${line}`}
                onClick={() => onSelect(line, length)}
                className={`h-9 rounded-lg border text-[11px] font-bold transition-all active:scale-95 ${
                  active
                    ? 'border-[#10B981] bg-[#10B981] text-white shadow-sm ring-2 ring-[#10B981]/30'
                    : `${LENGTH_ACCENT[length] ?? 'bg-[var(--bg-surface)]'} text-[var(--text-primary)]`
                }`}
              >
                {LENGTH_ABBR[length] ?? length.slice(0, 2)}
              </button>
            );
          })
        )}
      </div>

      <div className="mt-2 flex justify-between px-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        <span>Wide Off</span>
        <span>Off</span>
        <span>Middle</span>
        <span>Leg</span>
        <span>Wide Leg</span>
      </div>
    </div>
  );
};

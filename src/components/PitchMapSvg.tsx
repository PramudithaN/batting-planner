import React from 'react';
import { LENGTHS, LINES } from '../domain/types';

interface PitchMapSvgProps {
  selectedLine?: string;
  selectedLength?: string;
  stance?: 'RHB' | 'LHB';
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
  'Full toss':
    'border-[var(--border-strong)] border-l-4 border-l-[#D97706] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
  Yorker:
    'border-[var(--border-strong)] border-l-4 border-l-[#DC2626] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
  Full:
    'border-[var(--border-strong)] border-l-4 border-l-[#2563EB] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
  'Good length':
    'border-[var(--border-strong)] border-l-4 border-l-[#1D4ED8] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
  'Back of a length':
    'border-[var(--border-strong)] border-l-4 border-l-[#475569] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
  Short:
    'border-[var(--border-strong)] border-l-4 border-l-[#334155] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
};

export const PitchMapSvg: React.FC<PitchMapSvgProps> = ({
  selectedLine,
  selectedLength,
  stance = 'RHB',
  onSelect,
}) => {
  const isLhb = stance === 'LHB';
  const orderedLines = isLhb ? [...LINES].reverse() : LINES;
  const sideLabels = isLhb
    ? ['Wide Leg', 'Leg', 'Middle', 'Off', 'Wide Off']
    : ['Wide Off', 'Off', 'Middle', 'Leg', 'Wide Leg'];

  return (
    <div className="ui-card-elevated p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="ui-label mb-0">1-Tap Pitch Map ({stance})</span>
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
          orderedLines.map((line) => {
            const active = selectedLine === line && selectedLength === length;
            return (
              <button
                key={`${length}-${line}`}
                type="button"
                title={`${length} · ${line}`}
                onClick={() => onSelect(line, length)}
                className={`h-9 rounded-lg border text-[11px] font-extrabold transition-all active:scale-95 ${
                  active
                    ? 'border-[#0B1F4D] bg-[#1D4ED8] text-white shadow-sm ring-2 ring-[#2563EB]/40'
                    : `${LENGTH_ACCENT[length] ?? 'bg-[var(--bg-surface)]'}`
                }`}
              >
                {LENGTH_ABBR[length] ?? length.slice(0, 2)}
              </button>
            );
          })
        )}
      </div>

      <div className="mt-2 flex justify-between px-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)] sm:text-[10px]">
        {sideLabels.map((lbl) => (
          <span key={lbl}>{lbl}</span>
        ))}
      </div>
    </div>
  );
};

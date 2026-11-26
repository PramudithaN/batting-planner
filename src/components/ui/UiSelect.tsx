import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface UiSelectOption {
  value: string;
  label: string;
}

interface UiSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: UiSelectOption[];
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const UiSelect: React.FC<UiSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  size = 'md',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] text-left font-medium text-[var(--text-primary)] transition-all hover:border-[var(--accent-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 ${
          size === 'sm' ? 'min-h-[36px] px-2.5 py-1.5 text-xs' : 'min-h-[42px] px-3 py-2 text-sm'
        }`}
      >
        <span className={`truncate ${!selected ? 'text-[var(--text-muted)]' : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${
            open ? 'rotate-180 text-[var(--accent-primary)]' : ''
          }`}
        />
      </button>

      {open && (
        <div className="animate-in fade-in-0 zoom-in-95 absolute left-0 z-50 mt-1.5 max-h-64 w-full min-w-[180px] overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1 shadow-xl ring-1 ring-black/5">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-[var(--accent-primary)]/12 font-semibold text-[var(--accent-primary)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

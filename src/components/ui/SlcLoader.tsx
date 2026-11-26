import React from 'react';

interface SlcLoaderProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Sri Lanka Cricket themed loader with Maroon (#881337), Royal Blue (#1D4ED8), and Gold/Yellow (#EAB308) stripes.
 */
export const SlcLoader: React.FC<SlcLoaderProps> = ({
  label,
  size = 'md',
  className = '',
}) => {
  const barWidth = size === 'sm' ? 'w-16' : size === 'lg' ? 'w-40' : 'w-28';
  const barHeight = size === 'sm' ? 'h-1' : size === 'lg' ? 'h-2' : 'h-1.5';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex flex-col items-center justify-center gap-2 ${className}`}
    >
      {/* Animated 3-Stripe Sri Lanka Bar (Maroon, Blue, Yellow) */}
      <div
        className={`relative overflow-hidden rounded-full bg-black/15 dark:bg-white/10 ${barWidth} ${barHeight}`}
      >
        <div className="flex h-full w-full animate-pulse">
          <div className="h-full w-1/3 bg-[#881337]" />
          <div className="h-full w-1/3 bg-[#1D4ED8]" />
          <div className="h-full w-1/3 bg-[#EAB308]" />
        </div>
      </div>

      {/* Tri-color Spinning Ring */}
      {size !== 'sm' && (
        <div className="relative h-7 w-7 animate-spin rounded-full border-[3px] border-transparent border-t-[#881337] border-r-[#1D4ED8] border-b-[#EAB308]" />
      )}

      {label && (
        <span className="text-xs font-semibold tracking-wide text-[var(--text-secondary)]">
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * Full-width top loading stripe in Maroon, Royal Blue, and Yellow.
 */
export const SlcTopProgressBar: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      className="fixed top-0 right-0 left-0 z-50 flex h-1 w-full animate-pulse overflow-hidden"
    >
      <div className="h-full w-1/3 bg-[#881337]" />
      <div className="h-full w-1/3 bg-[#1D4ED8]" />
      <div className="h-full w-1/3 bg-[#EAB308]" />
    </div>
  );
};

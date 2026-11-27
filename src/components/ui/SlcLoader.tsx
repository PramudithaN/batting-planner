import React from 'react';

interface SlcLoaderProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Sri Lanka Cricket themed loader with 3 smooth blinking dots
 * in Maroon (#881337), Royal Blue (#1D4ED8), and Gold (#EAB308).
 */
export const SlcLoader: React.FC<SlcLoaderProps> = ({
  label,
  size = 'md',
  className = '',
}) => {
  const dotSize =
    size === 'sm' ? 'h-2 w-2' : size === 'lg' ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5';
  const gap = size === 'sm' ? 'gap-1.5' : size === 'lg' ? 'gap-2.5' : 'gap-2';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex flex-col items-center justify-center gap-2.5 ${className}`}
    >
      <div className={`flex items-center ${gap}`}>
        <span
          className={`slc-dot rounded-full bg-[#881337] ${dotSize}`}
          style={{ animationDelay: '0ms' }}
        />
        <span
          className={`slc-dot rounded-full bg-[#1D4ED8] ${dotSize}`}
          style={{ animationDelay: '160ms' }}
        />
        <span
          className={`slc-dot rounded-full bg-[#EAB308] ${dotSize}`}
          style={{ animationDelay: '320ms' }}
        />
      </div>

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

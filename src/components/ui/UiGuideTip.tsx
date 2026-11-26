import React from 'react';
import { HelpCircle, X } from 'lucide-react';

interface UiGuideTipProps {
  visible: boolean;
  title: string;
  description: string;
  position?: 'top' | 'bottom';
  align?: 'left' | 'right' | 'center';
  actionLabel?: string;
  onDismiss: () => void;
  onDismissAll?: () => void;
}

/**
 * Anchored floating popover tooltip pointing directly at the next button/tab/control.
 * Parent wrapper should have `relative`.
 */
export const UiGuideTip: React.FC<UiGuideTipProps> = ({
  visible,
  title,
  description,
  position = 'bottom',
  align = 'left',
  actionLabel = 'Next',
  onDismiss,
  onDismissAll,
}) => {
  if (!visible) return null;

  const posClasses = position === 'top' ? 'bottom-full mb-2.5' : 'top-full mt-2.5';
  const alignClasses =
    align === 'right'
      ? 'right-0'
      : align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : 'left-0';

  const arrowPosClasses =
    position === 'top'
      ? 'top-full border-t-[#0B1F4D] border-x-transparent border-b-transparent border-t-[7px] border-x-[7px] border-b-0'
      : 'bottom-full border-b-[#0B1F4D] border-x-transparent border-t-transparent border-b-[7px] border-x-[7px] border-t-0';

  const arrowAlignClasses =
    align === 'right'
      ? 'right-5'
      : align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : 'left-5';

  return (
    <div
      role="tooltip"
      className={`absolute z-40 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-[#2563EB] bg-[#0B1F4D] p-3 text-left text-xs text-white shadow-2xl ${posClasses} ${alignClasses}`}
    >
      {/* Pointer Arrow */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute h-0 w-0 border-solid ${arrowPosClasses} ${arrowAlignClasses}`}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-[#FACC15]">
          <HelpCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{title}</span>
        </div>
        {onDismissAll && (
          <button
            type="button"
            onClick={onDismissAll}
            title="Skip guide"
            className="rounded p-0.5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className="mt-1.5 leading-relaxed text-slate-200">{description}</p>

      <div className="mt-2.5 flex items-center justify-between">
        {onDismissAll ? (
          <button
            type="button"
            onClick={onDismissAll}
            className="text-[11px] font-medium text-slate-300 hover:text-white"
          >
            Skip guide
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md bg-[#2563EB] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#1D4ED8]"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface DingToastItem {
  id: string;
  msg: string;
  type: 'info' | 'error';
  exiting?: boolean;
}

interface UiDingToastProps {
  toasts: DingToastItem[];
  onDismiss: (id: string) => void;
}

/**
 * Spring-physics floating toast stack inspired by Ding (ding.yusufcengiz.dev).
 */
export const UiDingToast: React.FC<UiDingToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col-reverse items-center gap-2 px-4"
    >
      {toasts.map((t, index) => {
        const isError = t.type === 'error';
        const isTop = index === toasts.length - 1;
        return (
          <div
            key={t.id}
            role="status"
            style={{
              transform:
                isTop || t.exiting
                  ? undefined
                  : `scale(${Math.max(0.9, 1 - (toasts.length - 1 - index) * 0.04)})`,
              opacity: isTop ? 1 : 0.85,
            }}
            className={`${
              t.exiting ? 'ding-toast-exit' : 'ding-toast-enter'
            } pointer-events-auto flex items-center gap-2.5 rounded-full border px-3.5 py-2 text-xs font-semibold shadow-2xl backdrop-blur-md transition-all duration-300 ease-out ${
              isError
                ? 'border-rose-500/40 bg-[#1b1d1e]/95 text-rose-200'
                : 'border-white/15 bg-[#1b1d1e]/95 text-white'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                isError ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {isError ? (
                <AlertCircle className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
            </span>

            <span className="max-w-[260px] truncate sm:max-w-[320px]">{t.msg}</span>

            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="ml-1 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

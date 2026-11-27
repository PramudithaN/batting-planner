import React, { useEffect, useState } from 'react';
import { Download, PlusSquare, Share, X } from 'lucide-react';
import { hapticTap } from '../lib/haptics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setDismissed(true);
      return;
    }

    const ua = window.navigator.userAgent;
    const isAppleTouch =
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIos(isAppleTouch);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (dismissed || (!deferredPrompt && !isIos)) return null;

  const handleInstall = async () => {
    hapticTap();
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDismissed(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] sm:px-4">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Download className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
            <span className="truncate sm:whitespace-normal">
              Install <strong>Batting Practice</strong> on your{' '}
              {isIos ? 'iPhone / iPad' : 'phone or tablet'} for offline access.
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleInstall}
              className="ui-btn-primary min-h-[32px] px-3 py-1 text-xs"
            >
              Install App
            </button>
            <button
              type="button"
              aria-label="Dismiss install banner"
              onClick={() => {
                hapticTap();
                setDismissed(true);
              }}
              className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Add-to-Home-Screen Guided Sheet */}
      {showIosGuide && (
        <div className="ui-backdrop-enter fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-xs sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="ui-card ui-modal-enter w-full max-w-sm space-y-4 p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Install on iPhone / iPad
                </h3>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Add Batting Practice to your Home Screen in 2 quick taps:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2563EB]/15 text-[#2563EB]">
                  <Share className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-bold text-[var(--text-primary)]">1. Tap Share in Safari</p>
                  <p className="text-[var(--text-muted)]">
                    Look for the Share icon at the bottom (or top-right) of Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                  <PlusSquare className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-bold text-[var(--text-primary)]">2. Tap &ldquo;Add to Home Screen&rdquo;</p>
                  <p className="text-[var(--text-muted)]">
                    Scroll down the share sheet and tap Add to Home Screen.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="ui-btn-primary w-full"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

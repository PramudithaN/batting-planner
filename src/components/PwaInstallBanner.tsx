import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
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
    const iosDevice = /iPad|iPhone|iPod/.test(ua);
    setIsIos(iosDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (dismissed || (!deferredPrompt && !isIos)) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDismissed(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-xs text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {deferredPrompt ? (
            <>
              <Download className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
              <span>
                Install <strong>Batting Practice</strong> on your tablet home screen for offline access.
              </span>
            </>
          ) : (
            <>
              <Share className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
              <span>
                On iPad/iPhone: tap <strong>Share</strong> then <strong>Add to Home Screen</strong> to install.
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {deferredPrompt && (
            <button
              type="button"
              onClick={handleInstall}
              className="ui-btn-primary min-h-[32px] px-3 py-1 text-xs"
            >
              Install App
            </button>
          )}
          <button
            type="button"
            aria-label="Dismiss install banner"
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

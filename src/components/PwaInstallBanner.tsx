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
    <div className="border-b border-[#E2E8F0] bg-[#EFF6FF] px-4 py-2.5 text-xs text-[#0F294A]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {deferredPrompt ? (
            <>
              <Download className="h-4 w-4 shrink-0 text-[#2563EB]" />
              <span>
                Install <strong>Batting Practice</strong> on your tablet home screen for 1-tap offline access.
              </span>
            </>
          ) : (
            <>
              <Share className="h-4 w-4 shrink-0 text-[#2563EB]" />
              <span>
                On iPad/iPhone: tap <strong>Share</strong> then <strong>Add to Home Screen</strong> to install as an app.
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {deferredPrompt && (
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-md bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1D4ED8]"
            >
              Install App
            </button>
          )}
          <button
            type="button"
            aria-label="Dismiss install banner"
            onClick={() => setDismissed(true)}
            className="rounded p-1 text-[#475569] hover:bg-[#DBEAFE]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

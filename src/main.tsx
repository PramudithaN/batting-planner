import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      let refreshing = false;
      let userRequestedUpdate = false;
      let activeRegistration: ServiceWorkerRegistration | null = null;

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!userRequestedUpdate || refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      window.addEventListener('slc-sw-apply-update', () => {
        if (activeRegistration?.waiting) {
          userRequestedUpdate = true;
          activeRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
          window.location.reload();
        }
      });

      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .then((reg) => {
          activeRegistration = reg;

          if (reg.waiting && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('slc-sw-update'));
          }
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('slc-sw-update'));
              }
            });
          });

          // Check for updates when returning to the app or every 5 minutes
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              reg.update().catch(() => {});
            }
          });
          window.setInterval(() => {
            reg.update().catch(() => {});
          }, 5 * 60 * 1000);
        })
        .catch(() => {
          // Service worker registration is optional in non-HTTPS environments.
        });
    } else {
      // Unregister any stale service workers during local development so HMR stays clean.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) {
          reg.unregister();
        }
      });
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

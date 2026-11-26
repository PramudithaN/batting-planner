import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
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

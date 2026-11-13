'use client';

import { useEffect } from 'react';

/** Registers the service worker in production only (a SW in `next dev` caches stale chunks). */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let check: (() => void) | undefined;
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => {
          // Pick up a new release when the installed app is brought back to the foreground.
          check = () => { if (document.visibilityState === 'visible') registration.update().catch(() => {}); };
          document.addEventListener('visibilitychange', check);
        })
        .catch(() => {});
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => {
      window.removeEventListener('load', register);
      if (check) document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return null;
}

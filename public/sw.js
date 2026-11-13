/* IEEE Qassim service worker.
 *
 * Deliberately conservative: the site is personalised (Clerk sessions, admin tools) and talks to
 * a separate API origin, so HTML documents, API calls and anything cross-origin are NEVER cached.
 * What we cache is only what is safe and makes the app feel instant:
 *   - /_next/static/*  hashed, immutable build assets  -> cache-first
 *   - /icons, logo, fonts, images from this origin     -> stale-while-revalidate
 *   - navigations                                       -> network, falling back to /offline.html
 */
const VERSION = 'v1';
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = 'next-static'; // names are content-hashed, so this one survives version bumps
const ASSET_CACHE = `assets-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const MAX_STATIC_ENTRIES = 250;
const MAX_ASSET_ENTRIES = 120;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, STATIC_CACHE, ASSET_CACHE]);
    for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i += 1) await cache.delete(keys[i]);
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone()).then(() => trim(cacheName, max)).catch(() => {});
  }
  return response;
}

async function staleWhileRevalidate(event, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(event.request);
  const refresh = fetch(event.request).then((response) => {
    if (response.ok) cache.put(event.request, response.clone()).then(() => trim(cacheName, max)).catch(() => {});
    return response;
  });
  if (hit) {
    event.waitUntil(refresh.catch(() => {}));
    return hit;
  }
  return refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Clerk, API, fonts CDN, analytics: not ours to cache
  if (url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        return preload || await fetch(request);
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, MAX_STATIC_ENTRIES));
    return;
  }

  if (url.pathname.startsWith('/icons/') || /\.(?:png|jpe?g|webp|avif|svg|ico|woff2?)$/.test(url.pathname) || url.pathname.startsWith('/_next/image')) {
    event.respondWith(staleWhileRevalidate(event, ASSET_CACHE, MAX_ASSET_ENTRIES));
  }
});

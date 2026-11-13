import type { MetadataRoute } from 'next';

// One manifest for both locales: the installed app opens on the default (Arabic) locale and the
// language switcher is still one tap away. `id` keeps the install identity stable if start_url changes.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'IEEE Qassim University Student Branch',
    short_name: 'IEEE Qassim',
    description: 'المنصة الرسمية لمجتمع IEEE جامعة القصيم التقني — The official IEEE Qassim Technology Community platform.',
    lang: 'ar',
    dir: 'rtl',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8fafc',
    theme_color: '#00629B',
    categories: ['education', 'social'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'الفعاليات / Events', short_name: 'Events', url: '/events?source=pwa', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'ملفي / Profile', short_name: 'Profile', url: '/profile?source=pwa', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'لوحة الشرف / Leaderboard', short_name: 'Leaderboard', url: '/leaderboard?source=pwa', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
    ],
  };
}

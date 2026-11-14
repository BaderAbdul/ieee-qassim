import type { MetadataRoute } from 'next';

// The installed app is for staff (super admins / admins / members): it opens the admin overview.
// Students are never prompted to install it. `id` keeps the install identity stable if start_url changes.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'IEEE Qassim University Student Branch',
    short_name: 'IEEE Qassim',
    description: 'المنصة الرسمية لمجتمع IEEE جامعة القصيم التقني — The official IEEE Qassim Technology Community platform.',
    lang: 'ar',
    dir: 'rtl',
    start_url: '/ar/admin?source=pwa',
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
      { name: 'لوحة الإدارة / Overview', short_name: 'Overview', url: '/ar/admin?source=pwa', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'مركز المهام / Task Center', short_name: 'Tasks', url: '/ar/admin/operations?source=pwa', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'ملفي الشخصي / My profile', short_name: 'Profile', url: '/ar/admin/profile?source=pwa', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
    ],
  };
}

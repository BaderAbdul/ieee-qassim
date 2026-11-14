import { mainHostFor } from './adminHost';

/** Set (e.g. "admin.ieeequ.online") once the admin panel has its own subdomain; empty keeps everything on one host. */
export const ADMIN_HOST = (process.env.NEXT_PUBLIC_ADMIN_HOST || '').trim().toLowerCase();

/**
 * Origin to use for links meant for students and the public (event pages, check-in links, QR codes).
 * Inside the admin subdomain `window.location.origin` would be the admin host, which does not serve those pages.
 */
export function publicOrigin(): string {
  if (typeof window === 'undefined') return '';
  const { origin, hostname, protocol } = window.location;
  return ADMIN_HOST && hostname.toLowerCase() === ADMIN_HOST ? `${protocol}//${mainHostFor(ADMIN_HOST)}` : origin;
}

/** Absolute URL of the admin overview for a locale, or null when the panel is not on its own host. */
export const adminHomeUrl = (locale: string): string | null => (ADMIN_HOST ? `https://${ADMIN_HOST}/${locale}` : null);

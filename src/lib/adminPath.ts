'use client';

import { useSyncExternalStore } from 'react';
import { ADMIN_HOST } from './siteUrls';

/**
 * On the admin subdomain the address bar shows clean paths (/ar/operations) while the pages are served from
 * /ar/admin/operations. Components that decide "am I inside the admin panel?" from the pathname use these helpers
 * so both forms count as the panel.
 */
const hostIsAdmin = () => !!ADMIN_HOST && window.location.hostname.toLowerCase() === ADMIN_HOST;
const SHARED = /^\/(?:sign-in|sign-up|complete-profile|maintenance)(?:\/|$)/;
const LOCALE_PREFIX = /^\/(ar|en)(\/.*)?$/;

/**
 * True in the browser when the page is served from the admin subdomain. The server renders the rewritten
 * /admin path, so the hydration snapshot answers from the real host too -- server HTML and first client render agree.
 */
export function useOnAdminHost(): boolean {
  return useSyncExternalStore(() => () => {}, hostIsAdmin, () => typeof window !== 'undefined' && hostIsAdmin());
}

/** For locale-less paths (next-intl's usePathname): is this page part of the admin panel? */
export function inAdminArea(pathname: string, onAdminHost: boolean): boolean {
  return pathname.startsWith('/admin') || (onAdminHost && !SHARED.test(pathname));
}

/** For locale-prefixed paths (next/navigation's usePathname): the internal /<locale>/admin/... form of the current page. */
export function toAdminPath(pathname: string, onAdminHost: boolean): string {
  if (!onAdminHost) return pathname;
  const match = LOCALE_PREFIX.exec(pathname);
  if (!match) return pathname;
  const rest = match[2] ?? '';
  if (rest === '/admin' || rest.startsWith('/admin/') || SHARED.test(rest || '/')) return pathname;
  return `/${match[1]}/admin${rest}`;
}

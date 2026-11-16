'use client';

import { useSyncExternalStore } from 'react';
import { AUTH_HOST } from './siteUrls';

/**
 * The auth subdomain serves nothing but sign-in/sign-up (see authHost.ts). Components that render
 * the rest of the site -- nav, footer, background pollers -- use this to stay off it: their links
 * and API calls target the main site/API host and get CORS-blocked as cross-origin fetches from here.
 */
const hostIsAuth = () => !!AUTH_HOST && window.location.hostname.toLowerCase() === AUTH_HOST;

/**
 * True in the browser when the page is served from the auth subdomain.
 *
 * Unlike the admin host, every page the auth host serves is a SHARED path (sign-in/sign-up), so
 * there's no rewritten /admin-style pathname for the server to agree with -- the server render
 * always answers "false" (no window there), so hydration must match that exactly or React throws
 * a mismatch error. useSyncExternalStore then re-checks getSnapshot right after mount and corrects
 * to the real value, same trade-off adminPath.ts already accepts for its own shared paths.
 */
export function useOnAuthHost(): boolean {
  return useSyncExternalStore(() => () => {}, hostIsAuth, () => false);
}

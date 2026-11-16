'use client';

import { useSyncExternalStore } from 'react';
import { AUTH_HOST } from './siteUrls';

/**
 * The auth subdomain serves nothing but sign-in/sign-up (see authHost.ts). Components that render
 * the rest of the site -- nav, footer, background pollers -- use this to stay off it: their links
 * and API calls target the main site/API host and get CORS-blocked as cross-origin fetches from here.
 */
const hostIsAuth = () => !!AUTH_HOST && window.location.hostname.toLowerCase() === AUTH_HOST;

/** True in the browser when the page is served from the auth subdomain. */
export function useOnAuthHost(): boolean {
  return useSyncExternalStore(() => () => {}, hostIsAuth, () => typeof window !== 'undefined' && hostIsAuth());
}

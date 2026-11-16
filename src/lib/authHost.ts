/**
 * Sign-in/sign-up on their own subdomain (auth.<site>): which URLs the middleware should redirect.
 *
 * The auth host serves nothing but auth -- its pages are the existing locale pages, unchanged:
 *   auth.ieeequ.online/ar/sign-in  -> same page as www.ieeequ.online/ar/sign-in, no rewrite needed
 *   auth.ieeequ.online/            -> redirects to /ar/sign-in
 * On the main site, /{locale}/sign-in and /{locale}/sign-up redirect to the auth host so there's one
 * canonical place for auth (mirrors how /admin/... redirects to the admin host in adminHost.ts). The
 * production auth host is built in; NEXT_PUBLIC_AUTH_HOST overrides it ("off" disables the split).
 */

const PRODUCTION_AUTH_HOST = 'auth.ieeequ.online';

/** The auth host to use: the env override when set ("off" or empty-but-set disables), else the production host. */
export function configuredAuthHost(value: string | undefined): string {
  if (value === undefined) return PRODUCTION_AUTH_HOST;
  const host = value.trim().toLowerCase();
  return host === 'off' ? '' : host;
}

export type AuthRoute =
  | { action: 'none' }
  | { action: 'redirect'; path: string; host?: string };

const AUTH_SEGMENTS = new Set(['sign-in', 'sign-up']);
const LOCALE_PATH = /^\/(ar|en)(\/.*)?$/;

/** The site's public host for an auth host: auth.example.com -> www.example.com. */
export const mainHostForAuth = (authHost: string) => `www.${authHost.replace(/^auth\./, '')}`;

export function authRoute(host: string, pathname: string, authHost: string): AuthRoute {
  const auth = authHost.trim().toLowerCase();
  if (!auth) return { action: 'none' };
  const current = host.trim().toLowerCase().split(':')[0];

  if (current === auth) {
    if (pathname === '/') return { action: 'redirect', path: '/ar/sign-in' };
    const match = LOCALE_PATH.exec(pathname);
    const locale = match?.[1];
    const rest = match?.[2] ?? '';
    const first = rest.split('/')[1] ?? '';
    if (locale && AUTH_SEGMENTS.has(first)) return { action: 'none' };
    // Anything else has no business on this host -- send it to the main site.
    return { action: 'redirect', host: mainHostForAuth(auth), path: locale ? `/${locale}${rest}` : pathname };
  }

  // On the public site (and only there -- never on preview deployments) sign-in/up move to the auth host.
  const parent = auth.replace(/^auth\./, '');
  if (current === parent || current === `www.${parent}`) {
    const match = LOCALE_PATH.exec(pathname);
    const rest = match?.[2] ?? '';
    const first = rest.split('/')[1] ?? '';
    if (match && AUTH_SEGMENTS.has(first)) {
      return { action: 'redirect', host: auth, path: `/${match[1]}${rest}` };
    }
  }
  return { action: 'none' };
}

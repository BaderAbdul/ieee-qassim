/**
 * Admin panel on its own subdomain (admin.<site>): which URLs the middleware should redirect or rewrite.
 *
 * On the admin host the panel is the whole site, so its pages live at the root of the locale:
 *   admin.ieeequ.online/ar            -> the overview   (internally /ar/admin)
 *   admin.ieeequ.online/ar/operations -> Task Center    (internally /ar/admin/operations)
 * The old form (/ar/admin/...) redirects to the clean one, and on the main site /ar/admin/... redirects to the
 * admin host. Everything is inert until NEXT_PUBLIC_ADMIN_HOST is set (e.g. "admin.ieeequ.online").
 */

export type AdminRoute =
  | { action: 'none' }
  | { action: 'redirect'; path: string; host?: string }
  | { action: 'rewrite'; path: string };

// Pages that are not part of the panel but must still work on the admin host (sign-in has to happen there).
const SHARED_SEGMENTS = new Set(['sign-in', 'sign-up', 'complete-profile', 'maintenance']);
const LOCALE_PATH = /^\/(ar|en)(\/.*)?$/;

/** The site's public host for an admin host: admin.example.com -> www.example.com. */
export const mainHostFor = (adminHost: string) => `www.${adminHost.replace(/^admin\./, '')}`;

export function adminRoute(host: string, pathname: string, adminHost: string): AdminRoute {
  const admin = adminHost.trim().toLowerCase();
  if (!admin) return { action: 'none' };
  const current = host.trim().toLowerCase().split(':')[0];

  if (current === admin) {
    if (pathname === '/') return { action: 'redirect', path: '/ar' };
    const match = LOCALE_PATH.exec(pathname);
    if (!match) return { action: 'none' };
    const locale = match[1];
    const rest = match[2] ?? '';
    if (rest === '/admin' || rest.startsWith('/admin/')) return { action: 'redirect', path: `/${locale}${rest.slice('/admin'.length)}` };
    const first = rest.split('/')[1] ?? '';
    if (SHARED_SEGMENTS.has(first)) return { action: 'none' };
    return { action: 'rewrite', path: `/${locale}/admin${rest}` };
  }

  // On the public site (and only there -- never on preview deployments) the panel's old URLs move to the admin host.
  const parent = admin.replace(/^admin\./, '');
  if (current === parent || current === `www.${parent}`) {
    const match = LOCALE_PATH.exec(pathname);
    const rest = match?.[2] ?? '';
    if (match && (rest === '/admin' || rest.startsWith('/admin/'))) {
      return { action: 'redirect', host: admin, path: `/${match[1]}${rest.slice('/admin'.length)}` };
    }
  }
  return { action: 'none' };
}

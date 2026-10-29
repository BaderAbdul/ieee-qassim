import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { isMaintenanceOn, MAINTENANCE_BYPASS_COOKIE, verifyBypassCookieValue } from './lib/server/maintenance';

const intlMiddleware = createMiddleware(routing);
const MAINTENANCE_PATH = /\/maintenance(\/|$)/;

export default async function proxy(request: NextRequest) {
  const secret = process.env.MAINTENANCE_BYPASS_SECRET;
  const hasBypass = !!secret && verifyBypassCookieValue(request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value, secret);
  if (!hasBypass && !MAINTENANCE_PATH.test(request.nextUrl.pathname) && await isMaintenanceOn()) {
    const url = request.nextUrl.clone();
    url.pathname = `/${url.pathname.startsWith('/en') ? 'en' : 'ar'}/maintenance`;
    url.search = '';
    return NextResponse.rewrite(url);
  }
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for static files, _next, api, and Firebase auth paths
  matcher: ['/((?!api|_next|_vercel|__.*|.*\\..*).*)', '/', '/(ar|en)/:path*']
};

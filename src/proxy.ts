import { clerkMiddleware } from "@clerk/nextjs/server";

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { adminRoute } from './lib/adminHost';
import { isMaintenanceOn, MAINTENANCE_BYPASS_COOKIE, verifyBypassCookieValue } from './lib/server/maintenance';

const intlMiddleware = createMiddleware(routing);
const MAINTENANCE_PATH = /\/maintenance(\/|$)/;

async function middleware(request: NextRequest) {
  // Clerk's matcher now covers /api too; the maintenance rewrite must not catch API routes
  // (especially /api/maintenance-bypass itself) or JSON callers would get an HTML page back.
  if (/^\/(api|trpc)(\/|$)/.test(request.nextUrl.pathname)) return NextResponse.next();
  // Admin panel on its own subdomain (inert until NEXT_PUBLIC_ADMIN_HOST is set).
  const adminHost = process.env.NEXT_PUBLIC_ADMIN_HOST || '';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const onAdminHost = !!adminHost && host.toLowerCase().split(':')[0] === adminHost.toLowerCase();
  const route = adminRoute(host, request.nextUrl.pathname, adminHost);
  if (route.action === 'redirect') {
    const target = request.nextUrl.clone();
    if (route.host) { target.host = route.host; target.port = ''; target.protocol = 'https:'; }
    target.pathname = route.path;
    return NextResponse.redirect(target, 308);
  }
  const hidden = (response: NextResponse) => { if (onAdminHost) response.headers.set('X-Robots-Tag', 'noindex, nofollow'); return response; };

  const secret = process.env.MAINTENANCE_BYPASS_SECRET;
  const hasBypass = !!secret && verifyBypassCookieValue(request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value, secret);
  if (!hasBypass && !MAINTENANCE_PATH.test(request.nextUrl.pathname) && await isMaintenanceOn()) {
    const url = request.nextUrl.clone();
    url.pathname = `/${url.pathname.startsWith('/en') ? 'en' : 'ar'}/maintenance`;
    url.search = '';
    return hidden(NextResponse.rewrite(url));
  }
  if (route.action === 'rewrite') {
    // The panel's pages are served from /<locale>/admin/...; the visitor keeps the clean URL.
    const url = request.nextUrl.clone();
    url.pathname = route.path;
    const headers = new Headers(request.headers);
    headers.set('x-next-intl-locale', route.path.split('/')[1]);
    return hidden(NextResponse.rewrite(url, { request: { headers } }));
  }
  return hidden(intlMiddleware(request));
}
export default clerkMiddleware(async (auth, request) => {
  return middleware(request);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

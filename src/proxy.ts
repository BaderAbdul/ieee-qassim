import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
 
export default createMiddleware(routing);
 
export const config = {
  // Match all pathnames except for static files, _next, api, and Firebase auth paths
  matcher: ['/((?!api|_next|_vercel|__.*|.*\\..*).*)', '/', '/(ar|en)/:path*']
};

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Locale handling for public pages only. Admin, API, Next internals and files are excluded.
  matcher: ['/((?!api|admin|_next|_vercel|uploads|brand|.*\\..*).*)'],
};

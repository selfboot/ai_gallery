import { NextResponse } from 'next/server';

const LOCALES = ['en', 'zh'];
const PUBLIC_FILE_PATHS = new Set([
  '/90d513c720ec40e3a57f488239db260c.txt ',
  '/90d513c720ec40e3a57f488239db260c.txt%20',
  '/BingSiteAuth.xml',
  '/favicon.ico',
  '/gif.worker.js',
  '/logo192.png',
  '/logo512.png',
  '/manifest.json',
  '/robots.txt',
  '/rss-en.xml',
  '/rss.xml',
  '/sitemap-en.xml',
  '/sitemap-zh.xml',
  '/sitemap.xml',
]);
const PUBLIC_FILE_PREFIXES = ['/files/', '/racechart/'];
const FILE_PATH_PATTERN = /\/[^/]+\.[^/]+$/;

function isKnownPublicFile(pathname) {
  return PUBLIC_FILE_PATHS.has(pathname) || PUBLIC_FILE_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

function getPreferredLocale(request) {
  // 检查 cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie && LOCALES.includes(localeCookie)) {
    return localeCookie;
  }

  // 检查 Accept-Language 头
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage.split(',')[0].split('-')[0];
    if (LOCALES.includes(preferredLocale)) {
      return preferredLocale;
    }
  }

  // 默认语言
  return 'en';
}

export function middleware(request) {
  const pathname = request.nextUrl.pathname;

  if (isKnownPublicFile(pathname) || pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  // Unknown asset probes like /bundle.js should not be treated as [lang] pages.
  if (FILE_PATH_PATTERN.test(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  const preferredLocale = getPreferredLocale(request);

  // 处理根路径
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${preferredLocale}/games`, request.url));
  }

  // 缺少语言前缀的路径，补上语言前缀
  return NextResponse.redirect(new URL(`/${preferredLocale}${pathname}/`, request.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - en, zh (locale prefixed paths, already have locale)
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap, rss, robots.txt (metadata files)
     */
    '/((?!en|zh|api|_next/static|_next/image|favicon.ico|sitemap|rss|robots.txt).*)',
  ],
};

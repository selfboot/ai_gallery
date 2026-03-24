// proxy.js
import { NextResponse } from 'next/server';

const LOCALES = ['en', 'zh'];

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

export function proxy(request) {
  const pathname = request.nextUrl.pathname;

  // 静态文件直接跳过
  if (
    pathname.endsWith('.xml') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.csv') ||
    pathname.endsWith('.xlsx') ||
    pathname.endsWith('.docx') ||
    pathname.endsWith('.txt') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png')
  ) {
    return NextResponse.next();
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

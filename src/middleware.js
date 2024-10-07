// middleware.js
import { NextResponse } from "next/server";

const LOCALES = ["en", "zh"];

function getPreferredLocale(request) {
  // 检查 cookie
  const localeCookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (localeCookie && LOCALES.includes(localeCookie)) {
    return localeCookie;
  }

  // 检查 Accept-Language 头
  const acceptLanguage = request.headers.get("Accept-Language");
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage.split(",")[0].split("-")[0];
    if (LOCALES.includes(preferredLocale)) {
      return preferredLocale;
    }
  }

  // 默认语言
  return "en";
}

export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  let response;

  // 处理根路径
  if (pathname === "/") {
    const preferredLocale = getPreferredLocale(request);
    response = NextResponse.redirect(new URL(`/${preferredLocale}/algorithms`, request.url));
  } else if (pathname.endsWith(".xml") || pathname.endsWith(".js") || pathname.endsWith(".json") || pathname.endsWith(".csv")) {
    response = NextResponse.next();
  } else {
    // 处理缺少语言前缀的路径
    const pathnameIsMissingLocale = LOCALES.every(
      (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    );
    if (pathnameIsMissingLocale) {
      const preferredLocale = getPreferredLocale(request);
      response = NextResponse.redirect(new URL(`/${preferredLocale}${pathname}/`, request.url));
    } else {
      response = NextResponse.next();
    }
  }

  // 添加自定义 header
  if (response) {
    response.headers.set("x-pathname", pathname);
  } else {
    response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
  }

  response.headers.set("X-Robots-Tag", "index,follow");
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};

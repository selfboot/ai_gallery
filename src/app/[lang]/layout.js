import React from "react";
import "@/app/globals.css";
import Navigation from "@/app/components/Navigation";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { getDictionary } from "@/app/i18n/server";
import { I18nProvider } from "@/app/i18n/client";
import { getCommonDictionary } from "@/app/i18n/scoped";
import { SUPPORTED_LANGUAGES, isSupportedLanguage } from "@/app/i18n/locales";
import { notFound } from "next/navigation";
import Script from 'next/script';

const CATEGORIES = ["games", "algorithms", "tools", "blog"];

export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map(lang => ({ lang }));
}

export default async function Layout(props) {
  const params = await props.params;

  const {
    lang,
    slug = []
  } = params;

  const {
    children
  } = props;

  if (!isSupportedLanguage(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang);
  const commonDict = await getCommonDictionary(lang);
  const pathname = `/${lang}/${slug.join('/')}`;

  const rssFileName = lang === 'zh' ? 'rss.xml' : `rss-${lang}.xml`;

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`RSS Feed for AI Gallery`}
          href={`https://gallery.selfboot.cn/${rssFileName}`}
        />

        {/* Favicon links Start */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" /> */}
        {/* <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" /> */}
        <link rel="apple-touch-icon" sizes="192x192" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />
        {/* Favicon links End */}

        <Script id="check-device-and-load-ads" strategy="afterInteractive">
          {`
            (function() {
              if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                const script = document.createElement('script');
                script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7746897490519544";
                script.async = true;
                script.crossOrigin = "anonymous";
                document.head.appendChild(script);
              }
            })();
          `}
        </Script>
      </head>
      <body suppressHydrationWarning>
        <div className="flex flex-col min-h-screen">
          <nav className="min-h-[216px] bg-white shadow-md sm:min-h-[64px]">
            <div className="container mx-auto px-2 sm:px-4 py-3">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <Navigation categories={CATEGORIES} lang={lang} pathname={pathname} />
              </div>
            </div>
          </nav>
          <I18nProvider initialDictionary={commonDict}>
            <main className="flex-grow container mx-auto mt-6 px-2 sm:px-4"> {children} </main>
          </I18nProvider>
        </div>
        <Script id="google-analytics-init" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-Y4WD2DT404');
          `}
        </Script>
        <Script
          id="google-analytics"
          src="https://www.googletagmanager.com/gtag/js?id=G-Y4WD2DT404"
          strategy="lazyOnload"
        />
        {/* <WebVitals /> */}
        <Script
          src="https://analytics.selfboot.cn/stats.js"
          data-website-id="d2f2cea9-fadb-4ec6-bcd3-2bd614f8fa71"
          data-performance="true"
          strategy="lazyOnload"
          data-domains="gallery.selfboot.cn"
        />
        <Script
          id="cloudflare-web-analytics"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "29fc062c6fbd41318027e723a3589333"}'
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

import React from "react";
import "@/app/globals.css";
import Navigation from "@/app/components/Navigation";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { getDictionary } from "@/app/i18n/server";
import { I18nProvider } from "@/app/i18n/client";
import { GoogleAnalytics } from "@next/third-parties/google";
import { WebVitals } from "@/app/components/WebVitals";
import Script from 'next/script';

const SUPPORTED_LANGUAGES = ['en', 'zh'];
const CATEGORIES = ["games", "algorithms", "tools", "blog"];

export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map(lang => ({ lang }));
}

export default async function Layout({ children, params: { lang, slug = [] } }) {
  const dict = await getDictionary(lang);
  const pathname = `/${lang}/${slug.join('/')}`;

  const rssFileName = lang === 'zh' ? 'rss.xml' : `rss-${lang}.xml`;

  return (
    <html lang={lang}>
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`RSS Feed for AI Gallery`}
          href={`https://gallery.selfboot.cn/${rssFileName}`}
        />
        <meta name="baidu-site-verification" content="codeva-aNF6ICHngY" />
      </head>
      <body>
        <div className="flex flex-col min-h-screen">
          <nav className="bg-white shadow-md">
            <div className="container mx-auto px-2 sm:px-4 py-3">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <Navigation categories={CATEGORIES} lang={lang} pathname={pathname} />
              </div>
            </div>
          </nav>
          <I18nProvider initialDictionary={dict}>
            <main className="flex-grow container mx-auto mt-6 px-2 sm:px-4"> {children} </main>
          </I18nProvider>
        </div>
      </body>
      <GoogleAnalytics gaId="G-Y4WD2DT404" />
      <WebVitals />
      <Script
        src="https://cloud.umami.is/script.js"
        data-website-id="d765a8dd-62fd-4096-8429-85beb1242091"
        strategy="afterInteractive"
        data-domains="gallery.selfboot.cn"
      />
      <Script
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon='{"token": "29fc062c6fbd41318027e723a3589333"}'
        strategy="afterInteractive"
      />
    </html>
  );
}
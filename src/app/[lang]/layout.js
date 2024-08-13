import React from "react";
import "@/app/globals.css";
import Navigation from "@/app/components/Navigation";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { getDictionary } from "@/app/i18n/server";
import { I18nProvider } from "@/app/i18n/client";
import { headers } from "next/headers";
import { GoogleAnalytics } from "@next/third-parties/google";
import { WebVitals } from "@/app/components/WebVitals";
const CATEGORIES = ["games", "algorithms", "tools", "blog"];

export default async function Layout({ children, params: { lang } }) {
  const dict = await getDictionary(lang);
  const headersList = headers();
  const pathname = headersList.get("x-pathname") || `/${lang}`;

  return (
    <html lang={lang}>
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`RSS Feed for AI Gallery`}
          href={`https://gallery.selfboot.cn/${lang}/rss.xml`}
        />
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
            <main className="flex-grow container mx-auto mt-6 px-2 sm:px-4">{children}</main>
          </I18nProvider>
        </div>
      </body>
      <GoogleAnalytics gaId="G-Y4WD2DT404" />
      <WebVitals />
    </html>
  );
}

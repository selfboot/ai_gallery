import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";
import KMPVisualization from "./ClientContent";
import { ScopedI18nProvider } from "@/app/i18n/scoped";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);

  return PageMeta({
    title: dict.seo.kmp.title,
    description: dict.seo.kmp.description,
    keywords: dict.seo.kmp.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/kmp`,
    publishedDate: "2026-04-10T02:00:00.000Z",
    updatedDate: "2026-04-10T02:00:00.000Z",
  });
}

export default async function KMPPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/kmp`} />
      <ScopedI18nProvider locale={lang} scope="algorithms/kmp"><KMPVisualization lang={lang} /></ScopedI18nProvider>
      <BlogMarkdown lang={lang} directory="src/app/[lang]/algorithms/kmp" />
      <CommonComments lang={lang} />
    </>
  );
}

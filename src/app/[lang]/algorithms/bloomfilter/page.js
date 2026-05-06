import { getDictionary } from "@/app/dictionaries";
import BloomFilterDemo from "./ClientContent";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";
import { ScopedI18nProvider } from "@/app/i18n/scoped";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.bloomfilter.title,
    description: dict.seo.bloomfilter.description,
    keywords: dict.seo.bloomfilter.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/bloomfilter`,
    publishedDate: "2024-08-05T11:40:00.000Z",
    updatedDate: "2024-11-07T11:40:00.000Z",
  });
}

export default async function BloomFilterPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/bloomfilter`} />
      <ScopedI18nProvider locale={lang} scope="algorithms/bloomfilter"><BloomFilterDemo lang={lang} /></ScopedI18nProvider>
      <BlogMarkdown lang={lang} directory="src/app/[lang]/algorithms/bloomfilter" />
      <CommonComments lang={lang} />
    </>
  );
}

import { getDictionary } from "@/app/dictionaries";
import HashTable from "./ClientContent";
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
    title: dict.seo.hashtable.title,
    description: dict.seo.hashtable.description,
    keywords: dict.seo.hashtable.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/hashtable`,
    publishedDate: "2024-07-27T05:30:00.000Z",
    updatedDate: "2024-11-05T07:00:00.000Z",
  });
}

export default async function HashTablePage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/hashtable`} />
      <ScopedI18nProvider locale={lang} scope="algorithms/hashtable"><HashTable lang={lang} /></ScopedI18nProvider>
      <BlogMarkdown lang={lang} directory="src/app/[lang]/algorithms/hashtable" />
      <CommonComments lang={lang} />
    </>
  );
}

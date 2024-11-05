import { getDictionary } from "@/app/dictionaries";
import HashTable from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";

export async function generateMetadata({ params: { lang } }) {
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

export default function HashTablePage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/hashtable`} />
      <HashTable lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/algorithms/hashtable" />
      <CommonComments lang={lang} />
    </>
  );
}

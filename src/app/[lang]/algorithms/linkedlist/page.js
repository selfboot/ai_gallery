import { getDictionary } from "@/app/dictionaries";
import LinkedListVisualization from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.linkedlist.title,
    description: dict.seo.linkedlist.description,
    keywords: dict.seo.linkedlist.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/linkedlist`,
    publishedDate: "2024-07-19T02:00:00.000Z",
    updatedDate: "2024-07-19T02:00:00.000Z",
  });
}

export default function LinkedListPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/linkedlist`} />
      <LinkedListVisualization lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

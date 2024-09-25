import { getDictionary } from "@/app/dictionaries";
import HeapVisualization from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.heap.title,
    description: dict.seo.heap.description,
    keywords: dict.seo.heap.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/heap`,
    publishedDate: "2024-07-04T02:00:00.000Z",
    updatedDate: "2024-07-04T02:00:00.000Z",
  });
}

export default function HeapPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/heap`} />
      <HeapVisualization lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

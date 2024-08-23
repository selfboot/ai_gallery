import { getDictionary } from "@/app/dictionaries";
import BinarySearchTreeVisualization from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.dijkstra.title,
    description: dict.seo.dijkstra.description,
    keywords: dict.seo.dijkstra.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/binarysearchtree`,
    publishedDate: "2024-08-22T02:00:00.000Z",
    updatedDate: "2024-08-22T02:00:00.000Z",
  });
}

export default function BinarySearchTreePage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/binarysearchtree`} />
      <BinarySearchTreeVisualization lang={lang} />
    </>
  );
}

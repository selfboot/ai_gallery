import { getDictionary } from "@/app/dictionaries";
import DijkstraVisualization from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.dijkstra.title,
    description: dict.seo.dijkstra.description,
    keywords: dict.seo.dijkstra.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/dijkstra`,
    publishedDate: "2024-07-16T02:00:00.000Z",
    updatedDate: "2024-07-16T02:00:00.000Z",
  });
}

export default function DijkstraPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/dijkstra`} />
      <DijkstraVisualization lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

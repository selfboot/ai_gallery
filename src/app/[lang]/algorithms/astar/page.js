import { getDictionary } from "@/app/dictionaries";
import AStarPathFind from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.astar.title,
    description: dict.seo.astar.description,
    keywords: dict.seo.astar.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/astar/`,
    publishedDate: "2024-07-16T02:00:00.000Z",
    updatedDate: "2024-07-16T02:00:00.000Z",
  });
}

export default function AstarPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/astar/`} />
      <AStarPathFind lang={lang} />
    </>
  );
}

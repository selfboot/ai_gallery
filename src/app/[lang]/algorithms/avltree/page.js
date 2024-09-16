import { getDictionary } from "@/app/dictionaries";
import AVLTreeVisualization from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.binarysearchtree.title,
    description: dict.seo.binarysearchtree.description,
    keywords: dict.seo.binarysearchtree.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/avltree`,
    publishedDate: "2024-09-22T02:00:00.000Z",
    updatedDate: "2024-09-22T02:00:00.000Z",
  });
}

export default function AVLTreePage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/avltree`} />
      <AVLTreeVisualization lang={lang} />
    </>
  );
}

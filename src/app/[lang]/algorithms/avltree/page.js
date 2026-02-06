import { getDictionary } from "@/app/dictionaries";
import AVLTreeVisualization from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";

export async function generateMetadata(props) {
  const params = await props.params;

  const { lang } = params;

  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.avltree.title,
    description: dict.seo.avltree.description,
    keywords: dict.seo.avltree.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/avltree`,
    publishedDate: "2026-02-06T02:00:00.000Z",
    updatedDate: "2026-02-06T02:00:00.000Z",
  });
}

export default async function AVLTreePage(props) {
  const params = await props.params;

  const { lang } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/avltree`} />
      <AVLTreeVisualization lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/algorithms/avltree" />
      <CommonComments lang={lang} />
    </>
  );
}

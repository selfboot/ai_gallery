import { getDictionary } from "@/app/dictionaries";
import StackVisualization from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.stack.title,
    description: dict.seo.stack.description,
    keywords: dict.seo.stack.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/stack`,
    publishedDate: "2024-07-21T02:00:00.000Z",
    updatedDate: "2024-07-21T02:00:00.000Z",
  });
}

export default function StackPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/stack`} />
      <StackVisualization lang={lang} />
    </>
  );
}

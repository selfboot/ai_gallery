import { getDictionary } from "@/app/dictionaries";
import JumpHashVisualization from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.jumphash.title,
    description: dict.seo.jumphash.description,
    keywords: dict.seo.jumphash.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/jumphash`,
    publishedDate: "2024-08-09T12:50:00.000Z",
    updatedDate: "2024-08-09T12:50:00.000Z",
  });
}

export default function JumpHashPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/jumphash`} />
      <JumpHashVisualization lang={lang} />
    </>
  );
}

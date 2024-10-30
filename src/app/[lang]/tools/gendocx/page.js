import { getDictionary } from "@/app/dictionaries";
import GenDocx from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.chartrace.title,
    description: dict.seo.chartrace.description,
    keywords: dict.seo.chartrace.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/tools/gendocx`,
    publishedDate: "2024-07-08T02:00:00.000Z",
    updatedDate: "2024-07-08T09:00:00.000Z",
  });
}

export default function GenDocxPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/gendocx`} />
      <GenDocx lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

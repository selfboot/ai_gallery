import { getDictionary } from "@/app/dictionaries";
import SkipListVisualization from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.skiplist.title,
    description: dict.seo.skiplist.description,
    keywords: dict.seo.skiplist.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/skiplist`,
    publishedDate: "2024-07-28T07:30:00.000Z",
    updatedDate: "2024-07-28T07:30:00.000Z",
  });
}

export default async function StackPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/skiplist`} />
      <SkipListVisualization lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

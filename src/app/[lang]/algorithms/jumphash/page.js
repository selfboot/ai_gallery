import { getDictionary } from "@/app/dictionaries";
import JumpHashVisualization from "./content";
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
    title: dict.seo.jumphash.title,
    description: dict.seo.jumphash.description,
    keywords: dict.seo.jumphash.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/jumphash`,
    publishedDate: "2024-08-09T12:50:00.000Z",
    updatedDate: "2024-08-09T12:50:00.000Z",
  });
}

export default async function JumpHashPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/jumphash`} />
      <JumpHashVisualization lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

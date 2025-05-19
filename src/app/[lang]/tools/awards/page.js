import { getDictionary } from "@/app/dictionaries";
import GenAwards from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from '@/app/components/BlogMarkdown';

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.gendocx.title,
    description: dict.seo.gendocx.description,
    keywords: dict.seo.gendocx.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/tools/awards`,
    publishedDate: "2024-10-30T10:00:00.000Z",
    updatedDate: "2024-10-30T18:00:00.000Z",
  });
}

export default async function GenDocxPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/awards`} />
      <GenAwards lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

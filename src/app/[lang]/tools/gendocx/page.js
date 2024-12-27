import { getDictionary } from "@/app/dictionaries";
import GenDocx from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from '@/app/components/BlogMarkdown';

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.gendocx.title,
    description: dict.seo.gendocx.description,
    keywords: dict.seo.gendocx.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/tools/gendocx`,
    publishedDate: "2024-10-30T10:00:00.000Z",
    updatedDate: "2024-12-27T10:00:00.000Z",
  });
}

export default function GenDocxPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/gendocx`} />
      <GenDocx lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/gendocx" />
      <CommonComments lang={lang} />
    </>
  );
}

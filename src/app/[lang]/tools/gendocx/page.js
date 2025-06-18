import { getDictionary } from "@/app/dictionaries";
import GenDocx from "./content";
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
  return {
    ...PageMeta({
      title: dict.seo.gendocx.title,
      description: dict.seo.gendocx.description,
      keywords: dict.seo.gendocx.keywords,
      publishedDate: "2024-10-25T02:00:00.000Z",
      updatedDate: "2025-06-18T09:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/gendocx`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/tools/gendocx",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/gendocx",
        "x-default": "https://gallery.selfboot.cn/en/tools/gendocx",
      },
    },
  };
}

export default async function GenDocxPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/gendocx`} />
      <GenDocx lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/gendocx" />
      <CommonComments lang={lang} />
    </>
  );
}

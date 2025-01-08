import { getDictionary } from "@/app/dictionaries";
import TemplateList from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.gendocx_temp.title,
      description: dict.seo.gendocx_temp.description,
      keywords: dict.seo.gendocx_temp.keywords,
      publishedDate: "2025-01-08T09:00:00.000Z",
      updatedDate: "2025-01-08T09:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/gendocx/temp`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/tools/gendocx/temp",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/gendocx/temp",
        "x-default": "https://gallery.selfboot.cn/en/tools/gendocx/temp",
      },
    },
  };
}

export default function TemplatesPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/gendocx/temp`} title="gendocx_templates" />
      <TemplateList lang={lang} />
    </>
  );
}

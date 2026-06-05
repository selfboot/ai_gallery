import { documentTemplates } from "../../templates";
import { notFound } from "next/navigation";
import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import TemplateDocx from "./ClientContent";
import BlogMarkdown from "@/app/components/BlogMarkdown";
import { ScopedI18nProvider } from "@/app/i18n/scoped";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang,
    id
  } = params;

  const template = documentTemplates.find((template) => template.id === id);
  if (!template) return notFound();

  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict[template.id],
      description: dict.gendocx_temp[template.id],
      canonicalUrl: `https://gallery.selfboot.cn/${lang}/tools/gendocx/temp/${id}`,
      publishedDate: template.publishedDate,
      updatedDate: template.updatedDate,
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/gendocx/temp/${id}`,
      languages: {
        "en": `https://gallery.selfboot.cn/en/tools/gendocx/temp/${id}`,
        "zh-CN": `https://gallery.selfboot.cn/zh/tools/gendocx/temp/${id}`,
        "x-default": `https://gallery.selfboot.cn/en/tools/gendocx/temp/${id}`,
      },
    },
  };
}

export async function generateStaticParams() {
  return documentTemplates.flatMap((template) =>
    ["en", "zh"].map((lang) => ({
      lang,
      id: template.id,
    }))
  );
}

export default async function TemplatePage(props) {
  const params = await props.params;

  const {
    lang,
    id
  } = params;

  const template = documentTemplates.find((template) => template.id === id);
  if (!template) return notFound();

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/gendocx/temp/${id}`} title={template.id} />
      <ScopedI18nProvider locale={lang} scope="tools/gendocx/temp/[id]"><TemplateDocx lang={lang} template={template} /></ScopedI18nProvider>
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/gendocx/temp" />
    </>
  );
}

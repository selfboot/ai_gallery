import { getDictionary } from "@/app/dictionaries";
import TemplateList from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.gendocx.title,
    description: dict.seo.gendocx.description,
  });
}

export default function TemplatesPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/gendocx/templates`} title="gendocx_templates"/>
      <TemplateList lang={lang} />
    </>
  );
}

import { documentTemplates } from '../../templates';
import { notFound } from 'next/navigation';
import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import TemplateDocx from './content';

export async function generateMetadata({ params: { lang, id } }) {
  const template = documentTemplates[id];
  if (!template) return notFound();

  const dict = await getDictionary(lang);
  return PageMeta({
    title: `${dict.seo.gendocx.title} - ${template.name}`,
    description: template.description,
  });
}

export default function TemplatePage({ params: { lang, id } }) {
  const template = documentTemplates[id];
  if (!template) return notFound();

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/gendocx/temp/${id}`} />
      <TemplateDocx lang={lang} template={template} />
    </>
  );
}

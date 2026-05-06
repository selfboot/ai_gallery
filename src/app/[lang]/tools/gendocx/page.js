import GenDocx from "./ClientContent";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from '@/app/components/BlogMarkdown';
import { createToolMetadata, ToolStructuredData } from "../toolMetadata";
import { ScopedI18nProvider } from "@/app/i18n/scoped";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;

  return createToolMetadata("gendocx", lang);
}

export default async function GenDocxPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/gendocx`} />
      <ScopedI18nProvider locale={lang} scope="tools/gendocx"><GenDocx lang={lang} /></ScopedI18nProvider>
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/gendocx" />
      <ToolStructuredData toolId="gendocx" lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

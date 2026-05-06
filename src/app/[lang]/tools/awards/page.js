import GenAwards from "./ClientContent";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from '@/app/components/BlogMarkdown';
import { createToolMetadata, ToolStructuredData } from "../toolMetadata";
import { ScopedI18nProvider } from "@/app/i18n/scoped";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;

  return createToolMetadata("awards", lang);
}

export default async function GenDocxPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/awards`} />
      <ScopedI18nProvider locale={lang} scope="tools/awards"><GenAwards lang={lang} /></ScopedI18nProvider>
      <ToolStructuredData toolId="awards" lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

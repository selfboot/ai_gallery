import ImageSubtitleTool from "./ClientContent";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from '@/app/components/BlogMarkdown';
import { createToolMetadata, ToolStructuredData } from "../toolMetadata";
import { ScopedI18nProvider } from "@/app/i18n/scoped";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;

  return createToolMetadata("subtitles", lang);
}

export default async function SubtitlesPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/subtitles`} />
      <ScopedI18nProvider locale={lang} scope="tools/subtitles"><ImageSubtitleTool lang={lang} /></ScopedI18nProvider>
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/subtitles" />
      <ToolStructuredData toolId="subtitles" lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

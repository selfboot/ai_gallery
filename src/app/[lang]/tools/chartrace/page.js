import ChartRace from "./ClientContent";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from '@/app/components/BlogMarkdown';
import { createToolMetadata, ToolStructuredData } from "../toolMetadata";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;

  return createToolMetadata("chartrace", lang);
}

export default async function ChartRacePage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/chartrace`} />
      <ChartRace lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/chartrace" />
      <ToolStructuredData toolId="chartrace" lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

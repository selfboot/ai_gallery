import IitCalculator from "./ClientContent";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";
import { createToolMetadata, ToolStructuredData } from "../toolMetadata";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;

  return createToolMetadata("iit", lang);
}

export default async function IitPage(props) {
  const params = await props.params;

  const { lang } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/iit`} />
      <IitCalculator lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/iit" />
      <ToolStructuredData toolId="iit" lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

import RetirementCalculator from "./ClientContent";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";
import { createToolMetadata, ToolStructuredData } from "../toolMetadata";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;

  return createToolMetadata("retire", lang);
}

export default async function GenDocxPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/retire`} />
      <RetirementCalculator lang={lang} />
      <ToolStructuredData toolId="retire" lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

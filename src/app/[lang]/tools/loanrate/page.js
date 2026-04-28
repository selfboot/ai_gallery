import LoanRateCalculator from "./ClientContent";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from '@/app/components/BlogMarkdown';
import { createToolMetadata, ToolStructuredData } from "../toolMetadata";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;

  return createToolMetadata("loanrate", lang);
}

export default async function GenDocxPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/loanrate`} />
      <LoanRateCalculator lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/loanrate" />
      <ToolStructuredData toolId="loanrate" lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

import ExcelCleanContent from "./ClientContent";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";
import { createToolMetadata, ToolStructuredData } from "../toolMetadata";
import { ScopedI18nProvider } from "@/app/i18n/scoped";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;

  return createToolMetadata("excelclean", lang);
}

export default async function ExcelCleanPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/excelclean`} />
      <ScopedI18nProvider locale={lang} scope="tools/excelclean"><ExcelCleanContent /></ScopedI18nProvider>
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/excelclean" />
      <ToolStructuredData toolId="excelclean" lang={lang} />
      <CommonComments lang={lang} />
    </div>
  );
}

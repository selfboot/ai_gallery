import ClientContent from "./ClientContent";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";
import { createToolMetadata, ToolStructuredData } from "../toolMetadata";
import { ScopedI18nProvider } from "@/app/i18n/scoped";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;

  return createToolMetadata("pdfprotect", lang);
}

export default async function PdfProtectPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/pdfprotect`} />
      <ScopedI18nProvider locale={lang} scope="tools/pdfprotect"><ClientContent /></ScopedI18nProvider>
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/pdfprotect" />
      <ToolStructuredData toolId="pdfprotect" lang={lang} />
      <CommonComments lang={lang} />
    </div>
  );
}

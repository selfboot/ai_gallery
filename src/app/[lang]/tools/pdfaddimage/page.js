import PdfAddImageContent from "./ClientContent";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";
import { createToolMetadata, ToolStructuredData } from "../toolMetadata";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;

  return createToolMetadata("pdfaddimage", lang);
}

export default async function PdfAddImagePage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/pdfaddimage`} />
      <PdfAddImageContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/pdfaddimage" />
      <ToolStructuredData toolId="pdfaddimage" lang={lang} />
      <CommonComments lang={lang} />
    </div>
  );
}

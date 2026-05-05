import ClientContent from "./ClientContent";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";
import { createToolMetadata, ToolStructuredData } from "../toolMetadata";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;

  return createToolMetadata("imagegrid", lang);
}

export default async function ImageGridPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/imagegrid`} />
      <ClientContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/imagegrid" />
      <ToolStructuredData toolId="imagegrid" lang={lang} />
      <CommonComments lang={lang} />
    </div>
  );
}

import PdfPageNumberContent from "./ClientContent";
import PageHeader from "@/app/components/PageHeader";
import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);

  return {
    ...PageMeta({
      title: dict.seo.pdfpagenumber.title,
      description: dict.seo.pdfpagenumber.description,
      keywords: dict.seo.pdfpagenumber.keywords,
      publishedDate: "2026-04-22T10:10:00.000Z",
      updatedDate: "2026-04-22T10:10:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/pdfpagenumber`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/pdfpagenumber",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/pdfpagenumber",
        "x-default": "https://gallery.selfboot.cn/en/tools/pdfpagenumber",
      },
    },
  };
}

export default async function PdfPageNumberPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/pdfpagenumber`} />
      <PdfPageNumberContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/pdfpagenumber" />
      <CommonComments lang={lang} />
    </div>
  );
}

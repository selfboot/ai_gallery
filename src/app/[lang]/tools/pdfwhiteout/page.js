import PdfWhiteoutContent from "./ClientContent";
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
      title: dict.seo.pdfwhiteout.title,
      description: dict.seo.pdfwhiteout.description,
      keywords: dict.seo.pdfwhiteout.keywords,
      publishedDate: "2026-04-21T13:59:00.000Z",
      updatedDate: "2026-04-21T13:59:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/pdfwhiteout`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/pdfwhiteout",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/pdfwhiteout",
        "x-default": "https://gallery.selfboot.cn/en/tools/pdfwhiteout",
      },
    },
  };
}

export default async function PdfWhiteoutPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/pdfwhiteout`} />
      <PdfWhiteoutContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/pdfwhiteout" />
      <CommonComments lang={lang} />
    </div>
  );
}

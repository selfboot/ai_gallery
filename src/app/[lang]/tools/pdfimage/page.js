import PdfImageContent from "./ClientContent";
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
      title: dict.seo.pdfimage.title,
      description: dict.seo.pdfimage.description,
      keywords: dict.seo.pdfimage.keywords,
      publishedDate: "2026-04-19T02:00:00.000Z",
      updatedDate: "2026-04-19T02:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/pdfimage`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/pdfimage",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/pdfimage",
        "x-default": "https://gallery.selfboot.cn/en/tools/pdfimage",
      },
    },
  };
}

export default async function PdfImagePage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/pdfimage`} />
      <PdfImageContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/pdfimage" />
      <CommonComments lang={lang} />
    </div>
  );
}

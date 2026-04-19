import PdfAddImageContent from "./ClientContent";
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
      title: dict.seo.pdfaddimage.title,
      description: dict.seo.pdfaddimage.description,
      keywords: dict.seo.pdfaddimage.keywords,
      publishedDate: "2026-04-19T09:00:00.000Z",
      updatedDate: "2026-04-19T09:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/pdfaddimage`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/pdfaddimage",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/pdfaddimage",
        "x-default": "https://gallery.selfboot.cn/en/tools/pdfaddimage",
      },
    },
  };
}

export default async function PdfAddImagePage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/pdfaddimage`} />
      <PdfAddImageContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/pdfaddimage" />
      <CommonComments lang={lang} />
    </div>
  );
}

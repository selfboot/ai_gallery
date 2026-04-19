import PdfCompressContent from "./ClientContent";
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
      title: dict.seo.pdfcompress.title,
      description: dict.seo.pdfcompress.description,
      keywords: dict.seo.pdfcompress.keywords,
      publishedDate: "2026-04-19T08:00:00.000Z",
      updatedDate: "2026-04-19T08:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/pdfcompress`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/pdfcompress",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/pdfcompress",
        "x-default": "https://gallery.selfboot.cn/en/tools/pdfcompress",
      },
    },
  };
}

export default async function PdfCompressPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/pdfcompress`} />
      <PdfCompressContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/pdfcompress" />
      <CommonComments lang={lang} />
    </div>
  );
}

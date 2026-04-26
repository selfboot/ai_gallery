import ClientContent from "./ClientContent";
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
      title: dict.seo.pdfprotect.title,
      description: dict.seo.pdfprotect.description,
      keywords: dict.seo.pdfprotect.keywords,
      publishedDate: "2026-04-26T06:00:00.000Z",
      updatedDate: "2026-04-26T06:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/pdfprotect`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/pdfprotect",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/pdfprotect",
        "x-default": "https://gallery.selfboot.cn/en/tools/pdfprotect",
      },
    },
  };
}

export default async function PdfProtectPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/pdfprotect`} />
      <ClientContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/pdfprotect" />
      <CommonComments lang={lang} />
    </div>
  );
}

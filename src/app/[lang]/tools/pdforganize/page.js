import PdfOrganizeContent from "./ClientContent";
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
      title: dict.seo.pdforganize.title,
      description: dict.seo.pdforganize.description,
      keywords: dict.seo.pdforganize.keywords,
      publishedDate: "2026-04-18T10:00:00.000Z",
      updatedDate: "2026-04-18T10:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/pdforganize`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/pdforganize",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/pdforganize",
        "x-default": "https://gallery.selfboot.cn/en/tools/pdforganize",
      },
    },
  };
}

export default async function PdfOrganizePage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/pdforganize`} />
      <PdfOrganizeContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/pdforganize" />
      <CommonComments lang={lang} />
    </div>
  );
}

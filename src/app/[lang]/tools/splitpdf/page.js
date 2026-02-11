import PdfSplitContent from "./content";
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
      title: dict.seo.splitpdf.title,
      description: dict.seo.splitpdf.description,
      keywords: dict.seo.splitpdf.keywords,
      publishedDate: "2026-02-11T10:00:00.000Z",
      updatedDate: "2026-02-11T10:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/splitpdf`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/splitpdf",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/splitpdf",
        "x-default": "https://gallery.selfboot.cn/en/tools/splitpdf",
      },
    },
  };
}

export default async function PdfSplitPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/splitpdf`} />
      <PdfSplitContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/splitpdf" />
      <CommonComments lang={lang} />
    </div>
  );
}

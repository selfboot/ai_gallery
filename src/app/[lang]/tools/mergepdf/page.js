import PdfMergerContent from "./content";
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
      title: dict.seo.mergepdf.title,
      description: dict.seo.mergepdf.description,
      keywords: dict.seo.mergepdf.keywords,
      publishedDate: "2026-02-12T10:00:00.000Z",
      updatedDate: "2026-02-12T10:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/mergepdf`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/mergepdf",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/mergepdf",
        "x-default": "https://gallery.selfboot.cn/en/tools/mergepdf",
      },
    },
  };
}

export default async function PdfMergerPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/mergepdf`} />
      <PdfMergerContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/mergepdf" />
      <CommonComments lang={lang} />
    </div>
  );
}

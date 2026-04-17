import ExcelDedupeContent from "./ClientContent";
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
      title: dict.seo.exceldedupe.title,
      description: dict.seo.exceldedupe.description,
      keywords: dict.seo.exceldedupe.keywords,
      publishedDate: "2026-04-17T10:00:00.000Z",
      updatedDate: "2026-04-17T10:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/exceldedupe`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/exceldedupe",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/exceldedupe",
        "x-default": "https://gallery.selfboot.cn/en/tools/exceldedupe",
      },
    },
  };
}

export default async function ExcelDedupePage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/exceldedupe`} />
      <ExcelDedupeContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/exceldedupe" />
      <CommonComments lang={lang} />
    </div>
  );
}

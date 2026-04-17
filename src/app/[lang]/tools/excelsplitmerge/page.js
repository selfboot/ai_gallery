import ExcelSplitMergeContent from "./ClientContent";
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
      title: dict.seo.excelsplitmerge.title,
      description: dict.seo.excelsplitmerge.description,
      keywords: dict.seo.excelsplitmerge.keywords,
      publishedDate: "2026-04-17T10:00:00.000Z",
      updatedDate: "2026-04-17T10:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/excelsplitmerge`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/excelsplitmerge",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/excelsplitmerge",
        "x-default": "https://gallery.selfboot.cn/en/tools/excelsplitmerge",
      },
    },
  };
}

export default async function ExcelSplitMergePage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/excelsplitmerge`} />
      <ExcelSplitMergeContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/excelsplitmerge" />
      <CommonComments lang={lang} />
    </div>
  );
}

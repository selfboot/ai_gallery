import ExcelCompareContent from "./ClientContent";
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
      title: dict.seo.excelcompare.title,
      description: dict.seo.excelcompare.description,
      keywords: dict.seo.excelcompare.keywords,
      publishedDate: "2026-04-17T10:00:00.000Z",
      updatedDate: "2026-04-17T10:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/excelcompare`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/excelcompare",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/excelcompare",
        "x-default": "https://gallery.selfboot.cn/en/tools/excelcompare",
      },
    },
  };
}

export default async function ExcelComparePage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/excelcompare`} />
      <ExcelCompareContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/excelcompare" />
      <CommonComments lang={lang} />
    </div>
  );
}

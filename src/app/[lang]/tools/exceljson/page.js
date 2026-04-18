import ExcelJsonContent from "./ClientContent";
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
      title: dict.seo.exceljson.title,
      description: dict.seo.exceljson.description,
      keywords: dict.seo.exceljson.keywords,
      publishedDate: "2026-04-18T13:00:00.000Z",
      updatedDate: "2026-04-18T13:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/exceljson`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/exceljson",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/exceljson",
        "x-default": "https://gallery.selfboot.cn/en/tools/exceljson",
      },
    },
  };
}

export default async function ExcelJsonPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/exceljson`} />
      <ExcelJsonContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/exceljson" />
      <CommonComments lang={lang} />
    </div>
  );
}

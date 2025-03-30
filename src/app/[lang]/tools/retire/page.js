import { getDictionary } from "@/app/dictionaries";
import RetirementCalculator from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.retire.title,
      description: dict.seo.retire.description,
      keywords: dict.seo.retire.keywords,
      publishedDate: "2025-03-27T02:00:00.000Z",
      updatedDate: "2025-03-27T09:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/retire`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/tools/retire",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/retire",
        "x-default": "https://gallery.selfboot.cn/en/tools/retire",
      },
    },
  };
}

export default function GenDocxPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/retire`} />
      <RetirementCalculator lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

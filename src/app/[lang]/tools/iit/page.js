import { getDictionary } from "@/app/dictionaries";
import IitCalculator from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";

export async function generateMetadata(props) {
  const params = await props.params;

  const { lang } = params;

  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.iit.title,
      description: dict.seo.iit.description,
      keywords: dict.seo.iit.keywords,
      publishedDate: "2026-02-11T08:00:00.000Z",
      updatedDate: "2026-02-11T08:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/iit`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/tools/iit",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/iit",
        "x-default": "https://gallery.selfboot.cn/en/tools/iit",
      },
    },
  };
}

export default async function IitPage(props) {
  const params = await props.params;

  const { lang } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/iit`} />
      <IitCalculator lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/iit" />
      <CommonComments lang={lang} />
    </>
  );
}

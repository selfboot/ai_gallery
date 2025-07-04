import WordMergerContent from "./content";
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
      title: dict.seo.mergeword.title,
      description: dict.seo.mergeword.description,
      keywords: dict.seo.mergeword.keywords,
      publishedDate: "2025-07-04T17:00:00.000Z",
      updatedDate: "2025-07-04T18:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/mergeword`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/tools/mergeword",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/mergeword",
        "x-default": "https://gallery.selfboot.cn/en/tools/mergeword",
      },
    },
  };
}

export default async function WordMergerPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/mergeword`} />
      <WordMergerContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/mergeword" />
      <CommonComments lang={lang} />
    </div>
  );
}

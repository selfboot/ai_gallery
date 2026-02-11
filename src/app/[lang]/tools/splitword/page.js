import WordSplitContent from "./content";
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
      title: dict.seo.splitword.title,
      description: dict.seo.splitword.description,
      keywords: dict.seo.splitword.keywords,
      publishedDate: "2026-02-11T06:00:00.000Z",
      updatedDate: "2026-02-11T06:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/splitword`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/splitword",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/splitword",
        "x-default": "https://gallery.selfboot.cn/en/tools/splitword",
      },
    },
  };
}

export default async function WordSplitPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/splitword`} />
      <WordSplitContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/splitword" />
      <CommonComments lang={lang} />
    </div>
  );
}

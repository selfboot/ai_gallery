import RemoveBlankPagesContent from "./content";
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
      title: dict.seo.removeblank.title,
      description: dict.seo.removeblank.description,
      keywords: dict.seo.removeblank.keywords,
      publishedDate: "2025-11-14T06:00:00.000Z",
      updatedDate: "2025-11-14T06:30:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/removeblank`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/removeblank",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/removeblank",
        "x-default": "https://gallery.selfboot.cn/en/tools/removeblank",
      },
    },
  };
}

export default async function RemoveBlankPagesPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/removeblank`} />
      <RemoveBlankPagesContent lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/removeblank" />
      <CommonComments lang={lang} />
    </div>
  );
}



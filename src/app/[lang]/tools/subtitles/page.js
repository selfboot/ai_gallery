import { getDictionary } from "@/app/dictionaries";
import ImageSubtitleTool from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from '@/app/components/BlogMarkdown';

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.subtitles.title,
      description: dict.seo.subtitles.description,
      keywords: dict.seo.subtitles.keywords,
      publishedDate: "2024-07-28T02:00:00.000Z",
      updatedDate: "2025-01-15T09:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/subtitles`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/tools/subtitles",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/subtitles",
        "x-default": "https://gallery.selfboot.cn/en/tools/subtitles",
      },
    },
  };
}

export default async function SubtitlesPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/subtitles`} />
      <ImageSubtitleTool lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/subtitles" />
      <CommonComments lang={lang} />
    </>
  );
}

import { getDictionary } from "@/app/dictionaries";
import MazeGame from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.gomoku.title,
      description: dict.seo.gomoku.description,
      keywords: dict.seo.gomoku.keywords,
      publishedDate: "2024-07-01T02:00:00.000Z",
      updatedDate: "2024-11-19T09:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/maze`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/games/maze",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/maze",
        "x-default": "https://gallery.selfboot.cn/en/games/maze",
      },
    },
  };
}

export default function GomokuPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/maze`} />
      <MazeGame lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/maze" />
      <CommonComments lang={lang} />
    </>
  );
}

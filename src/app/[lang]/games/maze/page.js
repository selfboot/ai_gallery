import { getDictionary } from "@/app/dictionaries";
import MazeGame from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.maze.title,
      description: dict.seo.maze.description,
      keywords: dict.seo.maze.keywords,
      publishedDate: "2024-12-01T12:00:00.000Z",
      updatedDate: "2024-12-04T12:00:00.000Z",
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

export default async function MazePage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/maze`} />
      <MazeGame lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/maze" />
      <CommonComments lang={lang} />
    </>
  );
}

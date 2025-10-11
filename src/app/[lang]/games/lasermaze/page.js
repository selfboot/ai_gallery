import { getDictionary } from "@/app/dictionaries";
import LaserMazeGame from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";
import levelsData from "./levels.json";

export async function generateMetadata(props) {
  const params = await props.params;

  const { lang } = params;

  const dict = await getDictionary(lang);
  const seo = dict.seo?.lasermaze ?? {
    title: "Laser Maze Puzzle",
    description: "Guide the laser through reflective blocks to light up every target.",
    keywords: "laser maze, reflection puzzle, mirror game",
  };

  return {
    ...PageMeta({
      title: seo.title,
      description: seo.description,
      keywords: seo.keywords,
      publishedDate: "2024-12-01T03:00:00.000Z",
      updatedDate: "2024-12-01T03:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/lasermaze`,
      languages: {
        en: "https://gallery.selfboot.cn/en/games/lasermaze",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/lasermaze",
        "x-default": "https://gallery.selfboot.cn/en/games/lasermaze",
      },
    },
  };
}

export default async function LaserMazePage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/lasermaze`} />
      <LaserMazeGame lang={lang} defaults={levelsData.defaults} levels={levelsData.levels} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/lasermaze" />
      <CommonComments lang={lang} />
    </>
  );
}

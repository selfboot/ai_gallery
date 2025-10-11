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
  return {
    ...PageMeta({
      title: dict.seo.lasermaze.title,
      description: dict.seo.lasermaze.description,
      keywords: dict.seo.lasermaze.keywords,
      publishedDate: "2025-10-11T03:00:00.000Z",
      updatedDate: "2025-10-11T03:00:00.000Z",
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

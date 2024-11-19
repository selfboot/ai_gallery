import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import SokobanGallery from "./content";
import levelsData from "../levels.json";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.sokoban_more.title,
      description: dict.seo.sokoban_more.description,
      keywords: dict.seo.sokoban_more.keywords,
      publishedDate: "2024-11-19T03:00:00.000Z",
      updatedDate: "2024-11-19T13:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/sokoban/more`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/games/sokoban/more",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/sokoban/more",
        "x-default": "https://gallery.selfboot.cn/en/games/sokoban/more",
      },
    },
  };
}

export default function SokobanGalleryPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/sokoban/more`} title="sokoban_more_title" />
      <SokobanGallery levels={levelsData.levels} />
      <CommonComments lang={lang} />
    </>
  );
}

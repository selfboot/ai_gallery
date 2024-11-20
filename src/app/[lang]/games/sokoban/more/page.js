import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import SokobanGallery from "./content";
import levelsData from "../levels.json";
import extraLevelsData from "./more.json";
import { ELEMENTS, calculateMapId } from "../gameLogic";

function deduplicateAndSortLevels(levels) {
  const duplicates = new Map();
  const uniqueLevels = new Map();

  levels.forEach((level, index) => {
    const mapId = calculateMapId(level);
    if (!uniqueLevels.has(mapId)) {
      uniqueLevels.set(mapId, level);
    } else {
      if (!duplicates.has(mapId)) {
        duplicates.set(mapId, []);
      }
      duplicates.get(mapId).push(index);
    }
  });

  if (duplicates.size > 0) {
    console.log("Found duplicate maps:");
    duplicates.forEach((indices, mapId) => {
      console.log(`MapId ${mapId} appears at indices: ${indices.join(", ")}`);
    });
  }

  return [...uniqueLevels.values()].sort((a, b) => {
    const sizeA = a.length * a[0].length;
    const sizeB = b.length * b[0].length;
    if (sizeA !== sizeB) {
      return sizeA - sizeB;
    }

    const targetsA = a.flat().filter((cell) => cell === ELEMENTS.TARGET || cell === ELEMENTS.PLAYER_ON_TARGET).length;
    const targetsB = b.flat().filter((cell) => cell === ELEMENTS.TARGET || cell === ELEMENTS.PLAYER_ON_TARGET).length;
    return targetsA - targetsB;
  });
}

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
  const levels = deduplicateAndSortLevels([...levelsData.levels, ...extraLevelsData]);
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/sokoban/more`} title="sokoban_more_title" />
      <SokobanGallery levels={levels} />
      <CommonComments lang={lang} />
    </>
  );
}

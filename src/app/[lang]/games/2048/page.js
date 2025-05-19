import { getDictionary } from "@/app/dictionaries";
import Game2048 from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.game2048.title,
      description: dict.seo.game2048.description,
      keywords: dict.seo.game2048.keywords,
      publishedDate: "2024-07-15T02:00:00.000Z",
      updatedDate: "2024-11-19T09:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/2048`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/games/2048",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/2048",
        "x-default": "https://gallery.selfboot.cn/en/games/2048",
      },
    },
  };
}

export default async function Game2048Page(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/2048`} />
      <Game2048 lang={lang} />
      <CommonComments lang={lang} />  
    </>
  );
}

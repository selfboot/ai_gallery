import { getDictionary } from "@/app/dictionaries";
import Game2048 from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.game2048.title,
    description: dict.seo.game2048.description,
    keywords: dict.seo.game2048.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/games/2048/`,
    publishedDate: "2024-07-15T02:00:00.000Z",
    updatedDate: "2024-07-15T09:00:00.000Z",
  });
}

export default function Game2048Page({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/2048/`} />
      <Game2048 lang={lang} />
    </>
  );
}

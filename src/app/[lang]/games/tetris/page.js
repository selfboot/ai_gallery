import { getDictionary } from "@/app/dictionaries";
import TetrisGame from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.tetris.title,
    description: dict.seo.tetris.description,
    keywords: dict.seo.tetris.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/games/tetris`,
    publishedDate: "2024-07-01T02:00:00.000Z",
    updatedDate: "2024-07-01T09:00:00.000Z",
  });
}

export default function TetrisPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/tetris`} />
      <TetrisGame lang={lang} />
    </>
  );
}

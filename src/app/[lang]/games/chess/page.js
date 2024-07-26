import { getDictionary } from "@/app/dictionaries";
import ChineseChessBoard from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.chess.title,
    description: dict.seo.chess.description,
    keywords: dict.seo.chess.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/games/chess/`,
    publishedDate: "2024-07-08T02:00:00.000Z",
    updatedDate: "2024-07-08T09:00:00.000Z",
  });
}

export default function ChessPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/chess/`} />
      <ChineseChessBoard lang={lang} />
    </>
  );
}

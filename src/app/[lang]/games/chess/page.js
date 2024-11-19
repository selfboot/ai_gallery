import { getDictionary } from "@/app/dictionaries";
import ChineseChessBoard from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.chess.title,
      description: dict.seo.chess.description,
      keywords: dict.seo.chess.keywords,
      publishedDate: "2024-07-08T02:00:00.000Z",
      updatedDate: "2024-11-19T09:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/chess`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/games/chess",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/chess",
        "x-default": "https://gallery.selfboot.cn/en/games/chess",
      },
    },
  };
}

export default function ChessPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/chess`} />
      <ChineseChessBoard lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

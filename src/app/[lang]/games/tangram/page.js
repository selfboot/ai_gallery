import { getDictionary } from "@/app/dictionaries";
import TangramGame from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.tetris.title,
      description: dict.seo.tetris.description,
      keywords: dict.seo.tetris.keywords,
      publishedDate: "2025-05-11T02:00:00.000Z",
      updatedDate: "2025-05-19T02:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/tangram`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/games/tangram",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/tangram",
        "x-default": "https://gallery.selfboot.cn/en/games/tangram",
      },
    },
  };
}

export default function TetrisPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/tangram`} />
      <TangramGame lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

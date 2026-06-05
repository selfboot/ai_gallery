import { getDictionary } from "@/app/dictionaries";
import TetrisGame from "./ClientContent";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import { ScopedI18nProvider } from "@/app/i18n/scoped";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.tetris.title,
      description: dict.seo.tetris.description,
      keywords: dict.seo.tetris.keywords,
      canonicalUrl: `https://gallery.selfboot.cn/${lang}/games/tetris`,
      publishedDate: "2024-07-01T02:00:00.000Z",
      updatedDate: "2024-11-19T02:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/tetris`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/games/tetris",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/tetris",
        "x-default": "https://gallery.selfboot.cn/en/games/tetris",
      },
    },
  };
}

export default async function TetrisPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/tetris`} />
      <ScopedI18nProvider locale={lang} scope="games/tetris"><TetrisGame lang={lang} /></ScopedI18nProvider>
      <CommonComments lang={lang} />
    </>
  );
}

import { getDictionary } from "@/app/dictionaries";
import Minesweeper from "./ClientContent";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";
import { ScopedI18nProvider } from "@/app/i18n/scoped";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.minesweeper.title,
      description: dict.seo.minesweeper.description,
      keywords: dict.seo.minesweeper.keywords,
      canonicalUrl: `https://gallery.selfboot.cn/${lang}/games/minesweeper`,
      publishedDate: "2024-11-24T11:00:00.000Z",
      updatedDate: "2024-11-24T12:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/minesweeper`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/games/minesweeper",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/minesweeper",
        "x-default": "https://gallery.selfboot.cn/en/games/minesweeper",
      },
    },
  };
}

export default async function MinesweeperPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/minesweeper`} />
      <ScopedI18nProvider locale={lang} scope="games/minesweeper"><Minesweeper lang={lang} /></ScopedI18nProvider>
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/minesweeper" />
      <CommonComments lang={lang} />
    </>
  );
}

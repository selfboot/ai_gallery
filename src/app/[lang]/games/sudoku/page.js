import { getDictionary } from "@/app/dictionaries";
import SudokuGame from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from '@/app/components/BlogMarkdown';

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.sudoku.title,
      description: dict.seo.sudoku.description,
      keywords: dict.seo.sudoku.keywords,
      publishedDate: "2024-10-11T02:00:00.000Z",
      updatedDate: "2024-12-07T12:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/sudoku`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/games/sudoku",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/sudoku",
        "x-default": "https://gallery.selfboot.cn/en/games/sudoku",
      },
    },
  };
}

export default async function SudokuPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/sudoku`} />
      <SudokuGame lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/sudoku" />
      <CommonComments lang={lang} />
    </>
  );
}

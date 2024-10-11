import { getDictionary } from "@/app/dictionaries";
import SudokuGame from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from '@/app/components/BlogMarkdown';

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.sudoku.title,
    description: dict.seo.sudoku.description,
    keywords: dict.seo.sudoku.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/games/sudoku`,
    publishedDate: "2024-07-01T02:00:00.000Z",
    updatedDate: "2024-07-01T09:00:00.000Z",
  });
}

export default function SudokuPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/sudoku`} />
      <SudokuGame lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/sudoku" />
      <CommonComments lang={lang} />
    </>
  );
}

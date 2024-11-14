import { getDictionary } from "@/app/dictionaries";
import SokobanGame from "./content";
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
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/games/sokoban`,
    publishedDate: "2024-11-14T02:00:00.000Z",
    updatedDate: "2024-11-14T18:00:00.000Z",
  });
}

export default function SokobanPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/sokoban`} />
      <SokobanGame lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/sokoban" />
      <CommonComments lang={lang} />
    </>
  );
}

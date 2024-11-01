import { getDictionary } from "@/app/dictionaries";
import GomokuGame from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from '@/app/components/BlogMarkdown';

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.gomoku.title,
    description: dict.seo.gomoku.description,
    keywords: dict.seo.gomoku.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/games/gomoku`,
    publishedDate: "2024-07-01T02:00:00.000Z",
    updatedDate: "2024-10-26T09:00:00.000Z",
  });
}

export default function GomokuPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/gomoku`} />
      <GomokuGame lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/gomoku" />
      <CommonComments lang={lang} />
    </>
  );
}

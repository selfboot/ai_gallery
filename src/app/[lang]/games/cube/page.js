import { getDictionary } from "@/app/dictionaries";
import CubeGame from "./content";
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
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/games/cube`,
    publishedDate: "2024-10-25T02:00:00.000Z",
    updatedDate: "2024-10-25T09:00:00.000Z",
  });
}

export default function GomokuPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/cube`} />
      <CubeGame lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/cube" />
      <CommonComments lang={lang} />
    </>
  );
}

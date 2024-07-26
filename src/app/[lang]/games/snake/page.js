import { getDictionary } from "@/app/dictionaries";
import SnakeGame from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.snake.title,
    description: dict.seo.snake.description,
    keywords: dict.seo.snake.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/games/snake/`,
    publishedDate: "2024-07-08T02:00:00.000Z",
    updatedDate: "2024-07-08T09:00:00.000Z",
  });
}

export default function SnakePage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/snake/`} />
      <SnakeGame lang={lang} />
    </>
  );
}

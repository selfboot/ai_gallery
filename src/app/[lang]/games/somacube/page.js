import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";
import SomaCubeGame from "./components/SomaCubeGame";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.snake.title,
      description: dict.seo.snake.description,
      keywords: dict.seo.snake.keywords,
      publishedDate: "2024-07-08T02:00:00.000Z",
      updatedDate: "2024-11-19T09:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/somacube`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/games/somacube",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/somacube",
        "x-default": "https://gallery.selfboot.cn/en/games/somacube",
      },
    },
  };
}

export default function SomaCubePage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/somacube`} />
      <SomaCubeGame />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/somacube" />
      <CommonComments lang={lang} />
    </>
  );
}

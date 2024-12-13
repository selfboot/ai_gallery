import { getDictionary } from "@/app/dictionaries";
import LightupGame from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.maze.title,
      description: dict.seo.maze.description,
      keywords: dict.seo.maze.keywords,
      publishedDate: "2024-12-12T12:00:00.000Z",
      updatedDate: "2024-12-12T12:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/lightup`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/games/lightup",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/lightup",
        "x-default": "https://gallery.selfboot.cn/en/games/lightup",
      },
    },
  };
}

export default function LightupPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/lightup`} />
      <LightupGame lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/lightup" />
      <CommonComments lang={lang} />
    </>
  );
}

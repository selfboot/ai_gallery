import { getDictionary } from "@/app/dictionaries";
import GomokuGame from "./content";
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
      title: dict.seo.gomoku.title,
      description: dict.seo.gomoku.description,
      keywords: dict.seo.gomoku.keywords,
      publishedDate: "2024-07-01T02:00:00.000Z",
      updatedDate: "2024-11-19T09:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/gomoku`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/games/gomoku",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/gomoku",
        "x-default": "https://gallery.selfboot.cn/en/games/gomoku",
      },
    },
  };
}

export default async function GomokuPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/gomoku`} />
      <GomokuGame lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/gomoku" />
      <CommonComments lang={lang} />
    </>
  );
}

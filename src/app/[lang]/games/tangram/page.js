import { getDictionary } from "@/app/dictionaries";
import TangramGame from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from '@/app/components/BlogMarkdown';

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.tangram.title,
      description: dict.seo.tangram.description,
      keywords: dict.seo.tangram.keywords,
      publishedDate: "2025-05-16T12:00:00.000Z",
      updatedDate: "2025-05-16T13:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/tangram`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/games/tangram",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/tangram",
        "x-default": "https://gallery.selfboot.cn/en/games/tangram",
      },
    },
  };
}

export default function TetrisPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/tangram`} />
      <TangramGame lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/tangram" />
      <CommonComments lang={lang} />
    </>
  );
}

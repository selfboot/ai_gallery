import { getDictionary } from "@/app/dictionaries";
import UnblockMeGame from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";
import levelsData from "./levels.json";

export async function generateMetadata(props) {
  const params = await props.params;

  const { lang } = params;
  const dict = await getDictionary(lang);

  return {
    ...PageMeta({
      title: dict.seo.unblockme.title,
      description: dict.seo.unblockme.description,
      keywords: dict.seo.unblockme.keywords,
      publishedDate: "2025-09-24T09:00:00.000Z",
      updatedDate: "2025-09-24T09:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/unblockme`,
      languages: {
        en: "https://gallery.selfboot.cn/en/games/unblockme",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/unblockme",
        "x-default": "https://gallery.selfboot.cn/en/games/unblockme",
      },
    },
  };
}

export default async function UnblockMePage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/unblockme`} />
      <UnblockMeGame lang={lang} levels={levelsData.levels} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/unblockme" />
      <CommonComments lang={lang} />
    </>
  );
}

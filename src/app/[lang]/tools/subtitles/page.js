import { getDictionary } from "@/app/dictionaries";
import ImageSubtitleTool from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.subtitles.title,
    description: dict.seo.subtitles.description,
    keywords: dict.seo.subtitles.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/tools/subtitles`,
    publishedDate: "2024-07-28T14:00:00.000Z",
    updatedDate: "2024-07-28T14:00:00.000Z",
  });
}

export default function SubtitlesPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/subtitles`} />
      <ImageSubtitleTool lang={lang} />
    </>
  );
}

import { getDictionary } from "@/app/dictionaries";
import HanoiTower from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.hanoitower.title,
    description: dict.seo.hanoitower.description,
    keywords: dict.seo.hanoitower.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/hanoitower`,
    publishedDate: "2024-08-12T04:00:00.000Z",
    updatedDate: "2024-12-25T10:00:00.000Z",
  });
}

export default async function HanoiTowerPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/hanoitower`} />
      <HanoiTower lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/algorithms/hanoitower" />
      <CommonComments lang={lang} />
    </>
  );
}

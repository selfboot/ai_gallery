import { getDictionary } from "@/app/dictionaries";
import HanoiTower from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.hanoitower.title,
    description: dict.seo.hanoitower.description,
    keywords: dict.seo.hanoitower.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/hanoitower`,
    publishedDate: "2024-08-12T04:00:00.000Z",
    updatedDate: "2024-08-12T04:00:00.000Z",
  });
}

export default function HanoiTowerPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/hanoitower`} />
      <HanoiTower lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

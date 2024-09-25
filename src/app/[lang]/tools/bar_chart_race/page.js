import { getDictionary } from "@/app/dictionaries";
import BarChartRace from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.bar_chart_race.title,
    description: dict.seo.bar_chart_race.description,
    keywords: dict.seo.bar_chart_race.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/tools/bar_chart_race`,
    publishedDate: "2024-07-08T02:00:00.000Z",
    updatedDate: "2024-07-08T09:00:00.000Z",
  });
}

export default function BarChartRacePage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/bar_chart_race`} />
      <BarChartRace lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

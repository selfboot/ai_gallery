import { getDictionary } from "@/app/dictionaries";
import ChartRace from "./content";
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
  return PageMeta({
    title: dict.seo.chartrace.title,
    description: dict.seo.chartrace.description,
    keywords: dict.seo.chartrace.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/tools/chartrace`,
    publishedDate: "2024-07-08T02:00:00.000Z",
    updatedDate: "2024-07-08T09:00:00.000Z",
  });
}

export default async function ChartRacePage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/chartrace`} />
      <ChartRace lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/chartrace" />
      <CommonComments lang={lang} />
    </>
  );
}

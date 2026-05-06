import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";
import DynamicChartsContent from "./ClientContent";
import { ScopedI18nProvider } from "@/app/i18n/scoped";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);

  return PageMeta({
    title: dict.seo.chartrace.dynamicCharts.title ,
    description: dict.seo.chartrace.dynamicCharts.description,
    keywords: dict.seo.chartrace.dynamicCharts.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/tools/chartrace/dynamic`,
    publishedDate: "2024-10-01T02:00:00.000Z",
    updatedDate: "2024-10-03T09:00:00.000Z",
  });
}

export default async function DynamicChartsPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);

  return <ScopedI18nProvider locale={lang} scope="tools/chartrace/dynamic"><DynamicChartsContent initialDict={dict} lang={lang} /></ScopedI18nProvider>;
}

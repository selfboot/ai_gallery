import JsonLd from "@/app/components/JsonLd";
import { PageMeta } from "@/app/components/Meta";
import { getDictionary } from "@/app/dictionaries";
import {
  createToolStructuredData,
  getAlternateLocales,
  getCanonicalUrl,
  getLanguageAlternates,
  getLocale,
  getLocalizedToolImage,
  getToolDates,
  getToolText,
} from "./toolSeoData";

export async function createToolMetadata(toolId, lang) {
  const dict = await getDictionary(lang);
  const text = getToolText(toolId, lang, dict);
  const dates = getToolDates(toolId);

  return {
    ...PageMeta({
      title: text.title,
      description: text.description,
      keywords: text.keywords,
      canonicalUrl: getCanonicalUrl(toolId, lang),
      image: getLocalizedToolImage(toolId, lang),
      imageAlt: text.cardTitle,
      locale: getLocale(lang),
      alternateLocales: getAlternateLocales(lang),
      publishedDate: dates.publishedDate,
      updatedDate: dates.updatedDate,
    }),
    alternates: {
      canonical: getCanonicalUrl(toolId, lang),
      languages: getLanguageAlternates(toolId),
    },
  };
}

export async function ToolStructuredData({ toolId, lang }) {
  const dict = await getDictionary(lang);
  const text = getToolText(toolId, lang, dict);
  const structuredData = createToolStructuredData({
    toolId,
    lang,
    title: text.cardTitle,
    description: text.cardDescription || text.description,
    image: getLocalizedToolImage(toolId, lang),
  });

  return <JsonLd data={structuredData} />;
}

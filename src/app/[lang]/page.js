import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";
import { isSupportedLanguage } from "@/app/i18n/locales";
import { notFound } from "next/navigation";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  if (!isSupportedLanguage(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.index.title,
    description: dict.seo.index.description,
    keywords: dict.seo.index.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}`,
    publishedDate: "2024-06-15T02:00:00.000Z",
    updatedDate: "2024-06-15T02:00:00.000Z",
  });
}

export default async function Home(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  if (!isSupportedLanguage(lang)) {
    notFound();
  }

  return (
    // redriect now
    <></>
  );
}

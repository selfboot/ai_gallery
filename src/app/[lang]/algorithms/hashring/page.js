import { getDictionary } from "@/app/dictionaries";
import ConsistentHashRing from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.hashring.title,
    description: dict.seo.hashring.description,
    keywords: dict.seo.hashring.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/hashring/`,
    publishedDate: "2024-08-01T04:40:00.000Z",
    updatedDate: "2024-08-01T05:00:00.000Z",
  });
}

export default function HashRingPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/hashring/`} />
      <ConsistentHashRing lang={lang} />
    </>
  );
}

import { getDictionary } from "@/app/dictionaries";
import DPCoin from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.dpcoin.title,
    description: dict.seo.dpcoin.description,
    keywords: dict.seo.dpcoin.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/dpcoin/`,
    publishedDate: "2024-07-30T12:40:00.000Z",
    updatedDate: "2024-07-30T12:00:00.000Z",
  });
}

export default function DPCoinPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/dpcoin/`} />
      <DPCoin lang={lang} />
    </>
  );
}

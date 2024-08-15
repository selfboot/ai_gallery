import { getDictionary } from "@/app/dictionaries";
import TrieVisualization from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.trie.title,
    description: dict.seo.trie.description,
    keywords: dict.seo.trie.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/trie`,
    publishedDate: "2024-07-22T02:00:00.000Z",
    updatedDate: "2024-07-22T02:00:00.000Z",
  });
}

export default function TriePage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/trie`} />
      <TrieVisualization lang={lang} />
    </>
  );
}

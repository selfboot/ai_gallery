import { getDictionary } from "@/app/dictionaries";
import BFSPathFind from "./ClientContent";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";
import { ScopedI18nProvider } from "@/app/i18n/scoped";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.bfs_path.title,
    description: dict.seo.bfs_path.description,
    keywords: dict.seo.bfs_path.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/bfs_path`,
    publishedDate: "2024-07-16T02:00:00.000Z",
    updatedDate: "2024-10-22T02:00:00.000Z",
  });
}

export default async function BFSPathPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/bfs_path`} />
      <ScopedI18nProvider locale={lang} scope="algorithms/bfs_path"><BFSPathFind lang={lang} /></ScopedI18nProvider>
      <BlogMarkdown lang={lang} directory="src/app/[lang]/algorithms/bfs_path" />
      <CommonComments lang={lang} />
    </>
  );
}

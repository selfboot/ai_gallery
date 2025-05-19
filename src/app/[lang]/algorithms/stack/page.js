import { getDictionary } from "@/app/dictionaries";
import StackVisualization from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.stack.title,
    description: dict.seo.stack.description,
    keywords: dict.seo.stack.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/stack`,
    publishedDate: "2024-07-21T02:00:00.000Z",
    updatedDate: "2024-11-02T09:00:00.000Z",
  });
}

export default async function StackPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/stack`} />
      <StackVisualization lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/algorithms/stack" />
      <CommonComments lang={lang} />
    </>
  );
}

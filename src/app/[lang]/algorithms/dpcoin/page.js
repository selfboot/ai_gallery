import { getDictionary } from "@/app/dictionaries";
import DPCoin from "./content";
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
  return {
    ...PageMeta({
      title: dict.seo.dpcoin.title,
      description: dict.seo.dpcoin.description,
      keywords: dict.seo.dpcoin.keywords,
      publishedDate: "2024-07-30T12:40:00.000Z",
      updatedDate: "2024-11-21T04:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/algorithms/dpcoin`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/algorithms/dpcoin",
        "zh-CN": "https://gallery.selfboot.cn/zh/algorithms/dpcoin",
        "x-default": "https://gallery.selfboot.cn/en/algorithms/dpcoin",
      },
    },
  };
}

export default async function DPCoinPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/dpcoin`} />
      <DPCoin lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/algorithms/dpcoin" />
      <CommonComments lang={lang} />
    </>
  );
}

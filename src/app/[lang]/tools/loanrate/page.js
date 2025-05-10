import { getDictionary } from "@/app/dictionaries";
import LoanRateCalculator from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from '@/app/components/BlogMarkdown';

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.loanrate.title,
      description: dict.seo.loanrate.description,
      keywords: dict.seo.loanrate.keywords,
      publishedDate: "2025-04-28T12:00:00.000Z",
      updatedDate: "2025-05-07T12:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/loanrate`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/tools/loanrate",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/loanrate",
        "x-default": "https://gallery.selfboot.cn/en/tools/loanrate",
      },
    },
  };
}

export default function GenDocxPage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/tools/loanrate`} />
      <LoanRateCalculator lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/loanrate" />
      <CommonComments lang={lang} />
    </>
  );
}

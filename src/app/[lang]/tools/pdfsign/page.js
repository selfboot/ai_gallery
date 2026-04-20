import PdfSignContent from "./ClientContent";
import PageHeader from "@/app/components/PageHeader";
import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";
import CommonComments from "@/app/components/GiscusComments";
import BlogMarkdown from "@/app/components/BlogMarkdown";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);

  return {
    ...PageMeta({
      title: dict.seo.pdfsign.title,
      description: dict.seo.pdfsign.description,
      keywords: dict.seo.pdfsign.keywords,
      publishedDate: "2026-04-20T02:00:00.000Z",
      updatedDate: "2026-04-20T02:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/pdfsign`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/pdfsign",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/pdfsign",
        "x-default": "https://gallery.selfboot.cn/en/tools/pdfsign",
      },
    },
  };
}

export default async function PdfSignPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/pdfsign`} />
      <PdfSignContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/pdfsign" />
      <CommonComments lang={lang} />
    </div>
  );
}


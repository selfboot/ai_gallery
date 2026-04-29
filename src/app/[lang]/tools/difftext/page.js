import ClientContent from "./ClientContent";
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
      title: dict.seo.difftext.title,
      description: dict.seo.difftext.description,
      keywords: dict.seo.difftext.keywords,
      publishedDate: "2026-04-29T03:00:00.000Z",
      updatedDate: "2026-04-29T03:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/difftext`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/difftext",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/difftext",
        "x-default": "https://gallery.selfboot.cn/en/tools/difftext",
      },
    },
  };
}

export default async function DiffTextPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/difftext`} />
      <ClientContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/difftext" />
      <CommonComments lang={lang} />
    </div>
  );
}


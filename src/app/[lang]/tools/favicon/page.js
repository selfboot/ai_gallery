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
      title: dict.seo.favicon.title,
      description: dict.seo.favicon.description,
      keywords: dict.seo.favicon.keywords,
      publishedDate: "2026-04-25T13:00:00.000Z",
      updatedDate: "2026-04-25T13:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/favicon`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/favicon",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/favicon",
        "x-default": "https://gallery.selfboot.cn/en/tools/favicon",
      },
    },
  };
}

export default async function FaviconPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/favicon`} />
      <ClientContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/favicon" />
      <CommonComments lang={lang} />
    </div>
  );
}

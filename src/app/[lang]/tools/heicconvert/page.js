import HeicConvertContent from "./ClientContent";
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
      title: dict.seo.heicconvert.title,
      description: dict.seo.heicconvert.description,
      keywords: dict.seo.heicconvert.keywords,
      publishedDate: "2026-04-24T04:00:00.000Z",
      updatedDate: "2026-04-24T04:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/heicconvert`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/heicconvert",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/heicconvert",
        "x-default": "https://gallery.selfboot.cn/en/tools/heicconvert",
      },
    },
  };
}

export default async function HeicConvertPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/heicconvert`} />
      <HeicConvertContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/heicconvert" />
      <CommonComments lang={lang} />
    </div>
  );
}

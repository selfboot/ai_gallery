import ImageConvertContent from "./ClientContent";
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
      title: dict.seo.imageconvert.title,
      description: dict.seo.imageconvert.description,
      keywords: dict.seo.imageconvert.keywords,
      publishedDate: "2026-04-19T01:40:00.000Z",
      updatedDate: "2026-04-19T01:40:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/imageconvert`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/imageconvert",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/imageconvert",
        "x-default": "https://gallery.selfboot.cn/en/tools/imageconvert",
      },
    },
  };
}

export default async function ImageConvertPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/imageconvert`} />
      <ImageConvertContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/imageconvert" />
      <CommonComments lang={lang} />
    </div>
  );
}

import ImageSizeConvertContent from "./ClientContent";
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
      title: dict.seo.imagesizeconvert.title,
      description: dict.seo.imagesizeconvert.description,
      keywords: dict.seo.imagesizeconvert.keywords,
      publishedDate: "2026-04-22T09:00:00.000Z",
      updatedDate: "2026-04-22T09:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/imagesizeconvert`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/imagesizeconvert",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/imagesizeconvert",
        "x-default": "https://gallery.selfboot.cn/en/tools/imagesizeconvert",
      },
    },
  };
}

export default async function ImageSizeConvertPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/imagesizeconvert`} />
      <ImageSizeConvertContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/imagesizeconvert" />
      <CommonComments lang={lang} />
    </div>
  );
}

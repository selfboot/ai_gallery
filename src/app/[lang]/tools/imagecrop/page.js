import ImageCropContent from "./ClientContent";
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
      title: dict.seo.imagecrop.title,
      description: dict.seo.imagecrop.description,
      keywords: dict.seo.imagecrop.keywords,
      publishedDate: "2026-04-22T10:00:00.000Z",
      updatedDate: "2026-04-22T10:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/imagecrop`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/imagecrop",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/imagecrop",
        "x-default": "https://gallery.selfboot.cn/en/tools/imagecrop",
      },
    },
  };
}

export default async function ImageCropPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/imagecrop`} />
      <ImageCropContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/imagecrop" />
      <CommonComments lang={lang} />
    </div>
  );
}

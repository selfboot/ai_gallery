import ImageCropResizeContent from "./ClientContent";
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
      title: dict.seo.imageresize.title,
      description: dict.seo.imageresize.description,
      keywords: dict.seo.imageresize.keywords,
      publishedDate: "2026-04-21T05:00:00.000Z",
      updatedDate: "2026-04-21T05:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/imageresize`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/imageresize",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/imageresize",
        "x-default": "https://gallery.selfboot.cn/en/tools/imageresize",
      },
    },
  };
}

export default async function ImageCropResizePage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/imageresize`} />
      <ImageCropResizeContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/imageresize" />
      <CommonComments lang={lang} />
    </div>
  );
}


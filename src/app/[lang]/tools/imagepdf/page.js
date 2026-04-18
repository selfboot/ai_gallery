import ImagePdfContent from "./ClientContent";
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
      title: dict.seo.imagepdf.title,
      description: dict.seo.imagepdf.description,
      keywords: dict.seo.imagepdf.keywords,
      publishedDate: "2026-04-18T13:00:00.000Z",
      updatedDate: "2026-04-18T13:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/imagepdf`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/imagepdf",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/imagepdf",
        "x-default": "https://gallery.selfboot.cn/en/tools/imagepdf",
      },
    },
  };
}

export default async function ImagePdfPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/imagepdf`} />
      <ImagePdfContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/imagepdf" />
      <CommonComments lang={lang} />
    </div>
  );
}

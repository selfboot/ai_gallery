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
      title: dict.seo.imagemetadata.title,
      description: dict.seo.imagemetadata.description,
      keywords: dict.seo.imagemetadata.keywords,
      publishedDate: "2026-04-24T02:00:00.000Z",
      updatedDate: "2026-04-24T02:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/imagemetadata`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/imagemetadata",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/imagemetadata",
        "x-default": "https://gallery.selfboot.cn/en/tools/imagemetadata",
      },
    },
  };
}

export default async function ImageMetadataPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/imagemetadata`} />
      <ClientContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/imagemetadata" />
      <CommonComments lang={lang} />
    </div>
  );
}

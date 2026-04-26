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
      title: dict.seo.imagesprite.title,
      description: dict.seo.imagesprite.description,
      keywords: dict.seo.imagesprite.keywords,
      publishedDate: "2026-04-26T03:00:00.000Z",
      updatedDate: "2026-04-26T03:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/imagesprite`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/imagesprite",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/imagesprite",
        "x-default": "https://gallery.selfboot.cn/en/tools/imagesprite",
      },
    },
  };
}

export default async function ImageSpritePage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/imagesprite`} />
      <ClientContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/imagesprite" />
      <CommonComments lang={lang} />
    </div>
  );
}

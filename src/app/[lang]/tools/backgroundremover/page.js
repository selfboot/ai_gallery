import BackgroundRemoverContent from "./ClientContent";
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
      title: dict.seo.backgroundremover.title,
      description: dict.seo.backgroundremover.description,
      keywords: dict.seo.backgroundremover.keywords,
      publishedDate: "2026-04-27T13:00:00.000Z",
      updatedDate: "2026-04-27T13:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/backgroundremover`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/backgroundremover",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/backgroundremover",
        "x-default": "https://gallery.selfboot.cn/en/tools/backgroundremover",
      },
    },
  };
}

export default async function BackgroundRemoverPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/backgroundremover`} />
      <BackgroundRemoverContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/backgroundremover" />
      <CommonComments lang={lang} />
    </div>
  );
}

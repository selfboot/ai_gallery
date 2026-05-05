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
      title: dict.seo.screenshotsize.title,
      description: dict.seo.screenshotsize.description,
      keywords: dict.seo.screenshotsize.keywords,
      publishedDate: "2026-05-05T04:00:00.000Z",
      updatedDate: "2026-05-05T04:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/screenshotsize`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/screenshotsize",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/screenshotsize",
        "x-default": "https://gallery.selfboot.cn/en/tools/screenshotsize",
      },
    },
  };
}

export default async function ScreenshotSizePage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/screenshotsize`} />
      <ClientContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/screenshotsize" />
      <CommonComments lang={lang} />
    </div>
  );
}


import ImageWatermarkContent from "./ClientContent";
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
      title: dict.seo.imagewatermark.title,
      description: dict.seo.imagewatermark.description,
      keywords: dict.seo.imagewatermark.keywords,
      publishedDate: "2026-04-22T15:30:00.000Z",
      updatedDate: "2026-04-22T15:30:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/imagewatermark`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/imagewatermark",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/imagewatermark",
        "x-default": "https://gallery.selfboot.cn/en/tools/imagewatermark",
      },
    },
  };
}

export default async function ImageWatermarkPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/imagewatermark`} />
      <ImageWatermarkContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/imagewatermark" />
      <CommonComments lang={lang} />
    </div>
  );
}

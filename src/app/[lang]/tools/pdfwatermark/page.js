import PdfWatermarkContent from "./ClientContent";
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
      title: dict.seo.pdfwatermark.title,
      description: dict.seo.pdfwatermark.description,
      keywords: dict.seo.pdfwatermark.keywords,
      publishedDate: "2026-04-22T13:30:00.000Z",
      updatedDate: "2026-04-22T13:30:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/pdfwatermark`,
      languages: {
        en: "https://gallery.selfboot.cn/en/tools/pdfwatermark",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/pdfwatermark",
        "x-default": "https://gallery.selfboot.cn/en/tools/pdfwatermark",
      },
    },
  };
}

export default async function PdfWatermarkPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto mt-4">
      <PageHeader lang={lang} pathname={`/${lang}/tools/pdfwatermark`} />
      <PdfWatermarkContent />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/tools/pdfwatermark" />
      <CommonComments lang={lang} />
    </div>
  );
}

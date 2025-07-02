import { Suspense } from 'react';
import WordMergerContent from './content';
import PageHeader from '@/app/components/PageHeader';
import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);
  
  return {
    ...PageMeta({
      title: dict.mergeword_title,
      description: dict.mergeword_description,
      keywords: "Word文件合并, 在线Word合并, 免费Word合并工具",
      publishedDate: "2024-12-28T02:00:00.000Z",
      updatedDate: "2024-12-28T02:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/tools/mergeword`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/tools/mergeword",
        "zh-CN": "https://gallery.selfboot.cn/zh/tools/mergeword",
        "x-default": "https://gallery.selfboot.cn/en/tools/mergeword",
      },
    },
  };
}

export default async function WordMergerPage(props) {
  const params = await props.params;
  const { lang } = params;

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader 
        lang={lang}
        pathname={`/${lang}/tools/mergeword`}
      />
      <Suspense fallback={<div className="text-center py-8">加载中...</div>}>
        <WordMergerContent />
      </Suspense>
    </div>
  );
} 
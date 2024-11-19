import { getDictionary } from '@/app/dictionaries';
import SlidingPuzzle from './content';
import { PageMeta } from '@/app/components/Meta';
import PageHeader from '@/app/components/PageHeader';
import CommonComments from '@/app/components/GiscusComments';
import BlogMarkdown from '@/app/components/BlogMarkdown';

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return {
    ...PageMeta({
      title: dict.seo.sliding.title,
      description: dict.seo.sliding.description,
      keywords: dict.seo.sliding.keywords,
      publishedDate: "2024-11-01T02:00:00.000Z",
      updatedDate: "2024-11-19T09:00:00.000Z",
    }),
    alternates: {
      canonical: `https://gallery.selfboot.cn/${lang}/games/sliding`,
      languages: {
        "en": "https://gallery.selfboot.cn/en/games/sliding",
        "zh-CN": "https://gallery.selfboot.cn/zh/games/sliding",
        "x-default": "https://gallery.selfboot.cn/en/games/sliding",
      },
    },
  };
}

export default function SlidingPuzzlePage({ params: { lang } }) {
  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/games/sliding`} />
      <SlidingPuzzle lang={lang} />
      <BlogMarkdown lang={lang} directory="src/app/[lang]/games/sliding" />
      <CommonComments lang={lang} />
    </>
  );
}

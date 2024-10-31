import { getDictionary } from '@/app/dictionaries';
import SlidingPuzzle from './content';
import { PageMeta } from '@/app/components/Meta';
import PageHeader from '@/app/components/PageHeader';
import CommonComments from '@/app/components/GiscusComments';
import BlogMarkdown from '@/app/components/BlogMarkdown';

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.sliding.title,
    description: dict.seo.sliding.description,
    keywords: dict.seo.sliding.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/games/sliding`,
    publishedDate: '2024-10-31T14:00:00.000Z',
    updatedDate: '2024-10-31T15:00:00.000Z',
  });
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

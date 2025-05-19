import { getDictionary } from "@/app/dictionaries";
import RateLimiter from "./content";
import { PageMeta } from "@/app/components/Meta";
import PageHeader from "@/app/components/PageHeader";
import CommonComments from "@/app/components/GiscusComments";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);
  return PageMeta({
    title: dict.seo.ratelimit.title,
    description: dict.seo.ratelimit.description,
    keywords: dict.seo.ratelimit.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/ratelimit/`,
    publishedDate: "2024-07-14T02:00:00.000Z",
    updatedDate: "2024-07-15T02:00:00.000Z",
  });
}

export default async function RateLimiterPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  return (
    <>
      <PageHeader lang={lang} pathname={`/${lang}/algorithms/ratelimit/`} />
      <RateLimiter lang={lang} />
      <CommonComments lang={lang} />
    </>
  );
}

export function PageMeta({
  title,
  description,
  keywords,
  canonicalUrl,
  publishedDate,
  updatedDate
}) {
  return {
    title,
    description,
    keywords: keywords ? keywords.split(',') : undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: publishedDate,
      modifiedTime: updatedDate,
    },
  };
}
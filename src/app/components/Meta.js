export function PageMeta({
  title,
  description,
  keywords,
  canonicalUrl,
  image,
  imageAlt,
  type = "website",
  locale,
  alternateLocales,
  publishedDate,
  updatedDate
}) {
  const siteUrl = "https://gallery.selfboot.cn";
  const defaultImage = `${siteUrl}/logo512.png`;
  const normalizeUrl = (value) => {
    if (!value) return undefined;

    try {
      return new URL(value, siteUrl).toString();
    } catch {
      return undefined;
    }
  };

  const imageUrl = normalizeUrl(image) || defaultImage;
  const pageUrl = normalizeUrl(canonicalUrl);
  const keywordList = Array.isArray(keywords)
    ? keywords
    : keywords?.split(",").map((keyword) => keyword.trim()).filter(Boolean);

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    keywords: keywordList,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      type,
      url: pageUrl,
      siteName: "AI Gallery",
      locale,
      alternateLocale: alternateLocales,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt || title,
        },
      ],
      publishedTime: publishedDate,
      modifiedTime: updatedDate,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

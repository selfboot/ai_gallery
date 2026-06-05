import JsonLd from "./JsonLd";

const SITE_URL = "https://gallery.selfboot.cn";

function normalizePath(path) {
  if (!path) return "";
  return path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
}

export default function DirectoryStructuredData({ lang, path, title, description, items = [] }) {
  const url = `${SITE_URL}${path}`;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description,
        url,
        inLanguage: lang === "zh" ? "zh-CN" : "en",
        mainEntity: {
          "@type": "ItemList",
          itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.title,
            description: item.description,
            url: `${SITE_URL}/${lang}${normalizePath(item.link)}`,
            image: item.image,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: title,
            item: url,
          },
        ],
      },
    ],
  };

  return <JsonLd data={data} />;
}

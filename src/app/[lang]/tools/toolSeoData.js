import Projects from "../../config/project.js";

export const SITE_URL = "https://gallery.selfboot.cn";
export const TOOL_LANGUAGES = ["en", "zh"];

export const TOOL_METADATA_DATES = {
  awards: {
    publishedDate: "2024-10-30T10:00:00.000Z",
    updatedDate: "2024-10-30T18:00:00.000Z",
  },
  backgroundremover: {
    publishedDate: "2026-04-27T13:00:00.000Z",
    updatedDate: "2026-04-27T13:00:00.000Z",
  },
  chartrace: {
    publishedDate: "2024-07-08T02:00:00.000Z",
    updatedDate: "2024-07-08T09:00:00.000Z",
  },
  excelclean: {
    publishedDate: "2026-04-18T10:00:00.000Z",
    updatedDate: "2026-04-18T10:00:00.000Z",
  },
  excelcompare: {
    publishedDate: "2026-04-17T10:00:00.000Z",
    updatedDate: "2026-04-17T10:00:00.000Z",
  },
  exceldedupe: {
    publishedDate: "2026-04-17T10:00:00.000Z",
    updatedDate: "2026-04-17T10:00:00.000Z",
  },
  exceljson: {
    publishedDate: "2026-04-18T13:00:00.000Z",
    updatedDate: "2026-04-18T13:00:00.000Z",
  },
  excelsplitmerge: {
    publishedDate: "2026-04-18T10:00:00.000Z",
    updatedDate: "2026-04-18T10:00:00.000Z",
  },
  favicon: {
    publishedDate: "2026-04-25T13:00:00.000Z",
    updatedDate: "2026-04-25T13:00:00.000Z",
  },
  gendocx: {
    publishedDate: "2024-10-25T02:00:00.000Z",
    updatedDate: "2025-06-18T09:00:00.000Z",
  },
  heicconvert: {
    publishedDate: "2026-04-24T04:00:00.000Z",
    updatedDate: "2026-04-24T04:00:00.000Z",
  },
  iit: {
    publishedDate: "2026-02-11T08:00:00.000Z",
    updatedDate: "2026-02-11T08:00:00.000Z",
  },
  imagecompress: {
    publishedDate: "2026-04-19T01:00:00.000Z",
    updatedDate: "2026-04-19T01:20:00.000Z",
  },
  imageconvert: {
    publishedDate: "2026-04-19T01:40:00.000Z",
    updatedDate: "2026-04-19T01:40:00.000Z",
  },
  imagecrop: {
    publishedDate: "2026-04-22T10:00:00.000Z",
    updatedDate: "2026-04-22T10:00:00.000Z",
  },
  imagemetadata: {
    publishedDate: "2026-04-24T02:00:00.000Z",
    updatedDate: "2026-04-24T02:00:00.000Z",
  },
  imagepdf: {
    publishedDate: "2026-04-18T13:00:00.000Z",
    updatedDate: "2026-04-18T13:00:00.000Z",
  },
  imageresize: {
    publishedDate: "2026-04-21T05:00:00.000Z",
    updatedDate: "2026-04-21T05:00:00.000Z",
  },
  imagesizeconvert: {
    publishedDate: "2026-04-22T09:00:00.000Z",
    updatedDate: "2026-04-22T09:00:00.000Z",
  },
  imagesprite: {
    publishedDate: "2026-04-26T03:00:00.000Z",
    updatedDate: "2026-04-26T03:00:00.000Z",
  },
  imagewatermark: {
    publishedDate: "2026-04-22T15:30:00.000Z",
    updatedDate: "2026-04-22T15:30:00.000Z",
  },
  loanrate: {
    publishedDate: "2025-04-28T12:00:00.000Z",
    updatedDate: "2025-05-07T12:00:00.000Z",
  },
  mergepdf: {
    publishedDate: "2026-02-12T10:00:00.000Z",
    updatedDate: "2026-02-12T10:00:00.000Z",
  },
  mergeword: {
    publishedDate: "2025-07-04T17:00:00.000Z",
    updatedDate: "2025-07-04T18:00:00.000Z",
  },
  pdfaddimage: {
    publishedDate: "2026-04-19T09:00:00.000Z",
    updatedDate: "2026-04-19T09:00:00.000Z",
  },
  pdfcompress: {
    publishedDate: "2026-04-19T08:00:00.000Z",
    updatedDate: "2026-04-19T08:00:00.000Z",
  },
  pdfimage: {
    publishedDate: "2026-04-19T02:00:00.000Z",
    updatedDate: "2026-04-19T02:00:00.000Z",
  },
  pdforganize: {
    publishedDate: "2026-04-18T10:00:00.000Z",
    updatedDate: "2026-04-18T10:00:00.000Z",
  },
  pdfpagenumber: {
    publishedDate: "2026-04-22T10:10:00.000Z",
    updatedDate: "2026-04-22T10:10:00.000Z",
  },
  pdfprotect: {
    publishedDate: "2026-04-26T06:00:00.000Z",
    updatedDate: "2026-04-26T06:00:00.000Z",
  },
  pdfsign: {
    publishedDate: "2026-04-20T02:00:00.000Z",
    updatedDate: "2026-04-20T02:00:00.000Z",
  },
  pdfwatermark: {
    publishedDate: "2026-04-22T13:30:00.000Z",
    updatedDate: "2026-04-22T13:30:00.000Z",
  },
  pdfwhiteout: {
    publishedDate: "2026-04-21T13:59:00.000Z",
    updatedDate: "2026-04-21T13:59:00.000Z",
  },
  retire: {
    publishedDate: "2025-03-27T02:00:00.000Z",
    updatedDate: "2025-03-27T09:00:00.000Z",
  },
  splitpdf: {
    publishedDate: "2026-02-11T10:00:00.000Z",
    updatedDate: "2026-02-11T10:00:00.000Z",
  },
  splitword: {
    publishedDate: "2026-02-11T06:00:00.000Z",
    updatedDate: "2026-02-11T06:00:00.000Z",
  },
  subtitles: {
    publishedDate: "2024-07-28T02:00:00.000Z",
    updatedDate: "2025-01-15T09:00:00.000Z",
  },
};

const TOOL_CONFIG_ALIASES = {
  awards: "gendocx",
};

const TOOL_SEO_ALIASES = {
  awards: "gendocx",
};

const TOOL_ROUTE_OVERRIDES = {
  awards: "/tools/awards",
};

export function getToolConfigId(toolId) {
  return TOOL_CONFIG_ALIASES[toolId] || toolId;
}

export function getToolSeoId(toolId) {
  return TOOL_SEO_ALIASES[toolId] || toolId;
}

export function getToolDefinition(toolId) {
  const configId = getToolConfigId(toolId);
  return Projects.tools.find((tool) => tool.id === configId);
}

export function getToolRoute(toolId) {
  return TOOL_ROUTE_OVERRIDES[toolId] || `/tools/${toolId}`;
}

export function getCanonicalUrl(toolId, lang) {
  return `${SITE_URL}/${lang}${getToolRoute(toolId)}`;
}

export function getLocalizedToolImage(toolId, lang) {
  const tool = getToolDefinition(toolId);
  return tool?.images?.[lang] || tool?.image || `${SITE_URL}/logo512.png`;
}

export function getToolDates(toolId) {
  return TOOL_METADATA_DATES[toolId] || TOOL_METADATA_DATES[getToolConfigId(toolId)] || {};
}

export function getLocale(lang) {
  return lang === "zh" ? "zh_CN" : "en_US";
}

export function getAlternateLocales(lang) {
  return lang === "zh" ? ["en_US"] : ["zh_CN"];
}

export function getLanguageAlternates(toolId) {
  return {
    en: getCanonicalUrl(toolId, "en"),
    "zh-CN": getCanonicalUrl(toolId, "zh"),
    "x-default": getCanonicalUrl(toolId, "en"),
  };
}

export function getToolText(toolId, lang, dict) {
  const tool = getToolDefinition(toolId);
  const seoId = getToolSeoId(toolId);
  const seo = dict.seo?.[seoId] || {};

  return {
    title: seo.title || dict[tool?.title] || toolId,
    description: seo.description || dict[tool?.description] || "",
    keywords: seo.keywords || "",
    cardTitle: dict[tool?.title] || seo.title || toolId,
    cardDescription: dict[tool?.description] || seo.description || "",
  };
}

export function createToolStructuredData({ toolId, lang, title, description, image }) {
  const canonicalUrl = getCanonicalUrl(toolId, lang);
  const routeLabel = lang === "zh" ? "工具" : "Tools";

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: title,
        description,
        url: canonicalUrl,
        image,
        inLanguage: lang === "zh" ? "zh-CN" : "en",
        applicationCategory: "WebApplication",
        operatingSystem: "Any",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: routeLabel,
            item: `${SITE_URL}/${lang}/tools`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: title,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };
}

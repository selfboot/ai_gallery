export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/private/",
    },
    sitemap: "https://gallery.selfboot.cn/sitemap.xml",
  };
}

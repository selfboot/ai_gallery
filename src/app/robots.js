export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: "/private/",
      },
      {
        userAgent: ["OAI-SearchBot", "GPTBot", "ChatGPT-User"],
        allow: "/",
      },
    ],
    sitemap: "https://gallery.selfboot.cn/sitemap.xml",
  };
}

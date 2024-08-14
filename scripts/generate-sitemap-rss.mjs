import fs from "fs";
import path from "path";
import RSS from "rss";
import matter from "gray-matter";

const DOMAIN = "https://gallery.selfboot.cn";
const LANGUAGES = ["en", "zh"];

// 读取字典文件
function getDictionary(lang) {
  const dictPath = path.join(
    process.cwd(),
    "src",
    "app",
    "dictionaries",
    `${lang}.json`
  );
  const dictContent = fs.readFileSync(dictPath, "utf8");
  return JSON.parse(dictContent);
}

function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
}

async function generateSitemapAndRss() {
  const { globby } = await import("globby");

  for (const lang of LANGUAGES) {
    const pages = await globby([
      `src/app/[lang]/**/page.js`,
      `!src/app/[lang]/api`,
      `!src/app/[lang]/blog/[slug]`,
    ]);

    console.log(`Found pages for ${lang}:`, pages);

    let sitemapItems = [];
    let rssItems = [];

    const dict = getDictionary(lang);

    for (const page of pages) {
      console.log(`Processing page: ${page}`);

      const route = page
        .replace("src/app/[lang]", "")
        .replace("/page.js", "")
        .replace("/index", "");

      console.log(`Route: ${route}`);

      try {
        const content = fs.readFileSync(page, "utf8");
        const titleMatch = content.match(/title:\s*([^,\n]+)/);
        const descriptionMatch = content.match(/description:\s*([^,\n]+)/);
        const canonicalUrlMatch = content.match(/canonicalUrl:\s*(`[^`]+`)/);
        const publishedDateMatch = content.match(/publishedDate:\s*"([^"]+)"/);
        const updatedDateMatch = content.match(/updatedDate:\s*"([^"]+)"/);
      
        if (titleMatch && descriptionMatch) {
          const titleKey = titleMatch[1]
            .trim()
            .replace(/^dict\./, "")
            .replace(/['"]/g, "");
          const descriptionKey = descriptionMatch[1]
            .trim()
            .replace(/^dict\./, "")
            .replace(/['"]/g, "");

          if (titleKey && descriptionKey) {
            const metadata = {
              title: getNestedValue(dict, titleKey),
              description: getNestedValue(dict, descriptionKey),
              canonicalUrl: canonicalUrlMatch
                ? eval(canonicalUrlMatch[1]).replace("${lang}", lang)
                : `${DOMAIN}/${lang}${route}`,
              publishedDate: publishedDateMatch ? publishedDateMatch[1] : null,
              updatedDate: updatedDateMatch ? updatedDateMatch[1] : null,
            };

            console.log("Metadata:", metadata);

            const url = metadata.canonicalUrl;

            // 添加到 sitemap
            sitemapItems.push(`
  <url>
    <loc>${url}</loc>
    <lastmod>${metadata.updatedDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`);

            // 添加到 RSS
            rssItems.push({
              title: metadata.title,
              description: metadata.description,
              url: url,
              date: metadata.updatedDate,
            });
          } else {
            console.error("Invalid metadata structure");
          }
        } else {
          console.error("No Meta function call found");
        }
      } catch (error) {
        console.error(`Error processing page ${page}:`, error);
      }
    }

    const blogPosts = await globby([`src/posts/*/${lang}.md`]);

    for (const post of blogPosts) {
      const content = fs.readFileSync(post, "utf8");
      const { data, content: postContent } = matter(content);
      
      const slug = path.basename(path.dirname(post));
      const url = `${DOMAIN}/${lang}/blog/${slug}`;

      // 添加到 sitemap
      sitemapItems.push(`
  <url>
    <loc>${url}</loc>
    <lastmod>${data.date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);

      // 添加到 RSS
      rssItems.push({
        title: data.title,
        description: data.description || "",
        url: url,
        date: data.date,
        content: postContent
      });
    }

    console.log(`Sitemap items: ${sitemapItems.length}`);
    console.log(`RSS items: ${rssItems.length}`);

    // 生成 sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapItems.join("")}
</urlset>
`;
    fs.writeFileSync(`public/sitemap-${lang}.xml`, sitemap);

    const getRssFileName = (lang) => lang === 'zh' ? 'rss.xml' : `rss-${lang}.xml`;
    const feed = new RSS({
      title: `${getNestedValue(dict, "seo.index.title")}`,
      description: `${getNestedValue(dict, "seo.index.description")}`,
      feed_url: `${DOMAIN}/${getRssFileName(lang)}`,
      site_url: `${DOMAIN}/${lang}`,
      language: lang,
    });

    rssItems.forEach((item) => feed.item(item));
    const rssFileName = getRssFileName(lang);
    fs.writeFileSync(`public/${rssFileName}`, feed.xml({ indent: true }));
  }

  // 生成 sitemap 索引
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${LANGUAGES.map(
    (lang) => `
    <sitemap>
      <loc>${DOMAIN}/sitemap-${lang}.xml</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
    </sitemap>`
  ).join("")}
</sitemapindex>`;
  fs.writeFileSync("public/sitemap.xml", sitemapIndex);
}

generateSitemapAndRss();

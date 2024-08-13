import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { BlogIndex } from "@/app/components/BlogIndex";

async function getPostMetadata(lang) {
  const postsDirectory = path.join(process.cwd(), "src", "posts");
  const postSlugs = await fs.readdir(postsDirectory);

  const postsMetadata = await Promise.all(
    postSlugs.map(async (slug) => {
      const fullPath = path.join(postsDirectory, slug, `${lang}.md`);
      try {
        const fileContents = await fs.readFile(fullPath, "utf8");
        const { data, content } = matter(fileContents);

        // 从内容中提取第一张图片
        const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
        const coverImage = imageMatch ? imageMatch[1] : null;

        return { ...data, slug, coverImage };
      } catch (error) {
        console.error(`读取文件 ${fullPath} 时出错:`, error);
        return null;
      }
    })
  );

  return postsMetadata.filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export default async function BlogIndexPage({ params: { lang } }) {
  const posts = await getPostMetadata(lang);
  return <BlogIndex posts={posts} lang={lang} />;
}

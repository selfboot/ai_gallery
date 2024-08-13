import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { BlogIndex } from "@/app/components/BlogIndex";

async function getPostMetadata(lang) {
  const postsDirectory = path.join(process.cwd(), "src", "posts");
  console.log("Getting post metadata from:", postsDirectory);
  const postSlugs = await fs.readdir(postsDirectory);
  console.log("Post slugs found:", postSlugs);

  const postsMetadata = await Promise.all(
    postSlugs.map(async (slug) => {
      const fullPath = path.join(postsDirectory, slug, `${lang}.md`);
      console.log("Reading metadata from:", fullPath);
      try {
        const fileContents = await fs.readFile(fullPath, "utf8");
        const { data } = matter(fileContents);
        return { ...data, slug };
      } catch (error) {
        console.error(`Error reading file ${fullPath}:`, error);
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

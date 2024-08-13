import Link from "next/link";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

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

export default async function BlogIndex({ params: { lang } }) {
  console.log(`Rendering blog index: lang=${lang}`);
  const posts = await getPostMetadata(lang);
  console.log("Posts found:", posts.length);

  return (
    <div>
      <h1>Blog</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/${lang}/blog/${post.slug}`}>{post.title}</Link>
            <p>{post.date}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { BlogPost } from "@/app/components/BlogPost";
import { markdownToHtml } from "@/app/components/BlogMarkdown";
// import { GiscusComments } from "@/app/components/GiscusComments";

import dynamic from "next/dynamic";

const GiscusComments = dynamic(() => import("@/app/components/GiscusComments"), {
  ssr: false,
});


const langMap = {
  zh: "zh-CN",
  en: "en",
};

export default async function BlogPostPage({ params: { lang, slug } }) {
  const post = await getPostContent(slug, lang);

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <article className="max-w-2xl mx-auto mt-8">
      <BlogPost post={post} />
      <div className="mt-8">
        <GiscusComments lang={langMap[lang] || "en"} />
      </div>
    </article>
  );
}

export async function generateStaticParams() {
  const posts = await getPostSlugs();
  return posts.flatMap((slug) => [
    { lang: "en", slug },
    { lang: "zh", slug },
  ]);
}

async function getPostSlugs() {
  const postsDirectory = path.join(process.cwd(), "src", "posts");
  const directories = await fs.readdir(postsDirectory);
  return directories.filter(async (dir) => {
    const stat = await fs.stat(path.join(postsDirectory, dir));
    return stat.isDirectory();
  });
}

export async function getPostContent(slug, lang) {
  const fullPath = path.join(process.cwd(), "src", "posts", slug, `${lang}.md`);
  try {
    const fileContents = await fs.readFile(fullPath, "utf8");
    const { data, content } = matter(fileContents);
    const contentHtml = await markdownToHtml(content);
    return {
      slug,
      contentHtml,
      ...data,
    };
  } catch (error) {
    console.error(`Error reading file ${fullPath}:`, error);
    return null;
  }
}

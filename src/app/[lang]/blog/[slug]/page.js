import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

export async function generateStaticParams() {
  console.log("Generating static params...");
  const posts = await getPostSlugs();
  console.log("Post slugs:", posts);
  return posts.flatMap(slug => [
    { lang: 'en', slug },
    { lang: 'zh', slug }
  ]);
}

async function getPostSlugs() {
  const postsDirectory = path.join(process.cwd(), 'src', 'posts');
  console.log("Posts directory:", postsDirectory);
  const directories = await fs.readdir(postsDirectory);
  console.log("Directories found:", directories);
  return directories.filter(async (dir) => {
    const stat = await fs.stat(path.join(postsDirectory, dir));
    return stat.isDirectory();
  });
}

async function getPostContent(slug, lang) {
  const fullPath = path.join(process.cwd(), 'src', 'posts', slug, `${lang}.md`);
  console.log("Attempting to read file:", fullPath);
  try {
    const fileContents = await fs.readFile(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    const processedContent = await remark().use(html).process(content);
    const contentHtml = processedContent.toString();
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

export default async function BlogPost({ params: { lang, slug } }) {
  console.log(`Rendering blog post: lang=${lang}, slug=${slug}`);
  const post = await getPostContent(slug, lang);
  
  if (!post) {
    console.log(`Post not found: lang=${lang}, slug=${slug}`);
    return <div>Post not found</div>;
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
    </article>
  );
}
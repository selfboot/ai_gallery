import matter from "gray-matter";
import { BlogIndex } from "@/app/components/BlogIndex";
import { getDictionary } from '@/app/dictionaries';
import { PageMeta } from "@/app/components/Meta";
import { postsFiles, postSlugs } from "@/generated/posts-content";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);

  return PageMeta({
    title: dict.seo.blog.title,
    description: dict.seo.blog.description,
    keywords: dict.seo.blog.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/blog`,
    publishedDate: "2024-08-01T00:00:00.000Z",
    updatedDate: "2024-11-05T10:00:00.000Z",
  });
}

async function getPostMetadata(lang) {
  const postsMetadata = postSlugs.map((slug) => {
    const key = `${slug}/${lang}.md`;
    const fileContents = postsFiles[key];
    if (!fileContents) return null;

    try {
      const { data, content } = matter(fileContents);

      // 从内容中提取第一张图片
      const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
      const coverImage = imageMatch ? imageMatch[1] : null;

      return { ...data, slug, coverImage };
    } catch (error) {
      console.error(`读取文件 ${key} 时出错:`, error);
      return null;
    }
  });

  return postsMetadata.filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export default async function BlogIndexPage(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const posts = await getPostMetadata(lang);
  return <BlogIndex posts={posts} lang={lang} />;
}

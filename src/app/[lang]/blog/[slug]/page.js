import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { markdownToHtml } from "@/app/components/BlogMarkdown";
import TableOfContents from "@/app/components/TableOfContents";
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="lg:hidden mb-8">
        <TableOfContents content={post.contentHtml} />
      </div>
      <div className="flex flex-col lg:flex-row lg:space-x-8">
        <div className="w-full lg:w-3/5 max-w-full lg:max-w-3xl mx-auto">
          <article>
            <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
            <div className="markdown-body" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
          </article>
          <div className="mt-8">
            <GiscusComments lang={langMap[lang] || "en"} />
          </div>
        </div>
        <aside className="hidden lg:block lg:w-1/5">
          <div className="sticky top-8">
            <TableOfContents content={post.contentHtml} />
          </div>
        </aside>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { lang, slug } = params;
  const post = await getPostContent(slug, lang);
  
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords ? post.keywords.join(', ') : `blog, article, ${post.title}`,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
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

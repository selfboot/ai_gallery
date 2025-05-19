import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { markdownToHtml } from "@/app/components/BlogMarkdown";
import TableOfContents from "@/app/components/TableOfContents";
import CommonComments from "@/app/components/GiscusComments";
import { SideAdComponent } from "@/app/components/AdComponent";

export default async function BlogPostPage(props) {
  const params = await props.params;

  const {
    lang,
    slug
  } = params;

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
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
              {post.lastmod && post.lastmod !== post.date && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <time dateTime={post.lastmod}>
                    {new Date(post.lastmod).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </div>
              )}
            </div>
            <div className="markdown-body" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
          </article>
          <CommonComments lang={lang} />
        </div>
        <aside className="hidden lg:block lg:w-1/5">
          <div className="sticky top-4">
            <TableOfContents content={post.contentHtml} />
            <div className="hidden mt-8 md:relative md:block w-full bg-gray-100">
              <SideAdComponent format="vertical" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export async function generateMetadata(props) {
  const params = await props.params;
  const { lang, slug } = params;
  const post = await getPostContent(slug, lang);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords ? post.keywords.join(", ") : `${post.title}`,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
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

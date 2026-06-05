import matter from "gray-matter";
import { markdownToHtml } from "@/app/components/BlogMarkdown";
import TableOfContents from "@/app/components/TableOfContents";
import CommonComments from "@/app/components/GiscusComments";
import { SideAdComponent } from "@/app/components/AdComponent";
import { postsFiles, postSlugs } from "@/generated/posts-content";
import JsonLd from "@/app/components/JsonLd";
import { PageMeta } from "@/app/components/Meta";
import { notFound } from "next/navigation";

const SITE_URL = "https://gallery.selfboot.cn";

function getPostUrl(slug, lang) {
  return `${SITE_URL}/${lang}/blog/${slug}`;
}

function createBlogPostStructuredData(post, lang) {
  const url = getPostUrl(post.slug, lang);
  const authorName = post.author || "AI Gallery";

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        url,
        mainEntityOfPage: url,
        image: post.coverImage ? [new URL(post.coverImage, SITE_URL).toString()] : undefined,
        datePublished: post.date,
        dateModified: post.lastmod || post.date,
        inLanguage: lang === "zh" ? "zh-CN" : "en",
        author: {
          "@type": "Person",
          name: authorName,
        },
        publisher: {
          "@type": "Organization",
          name: "AI Gallery",
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/logo512.png`,
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Blog",
            item: `${SITE_URL}/${lang}/blog`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: post.title,
            item: url,
          },
        ],
      },
    ],
  };
}

export default async function BlogPostPage(props) {
  const params = await props.params;

  const {
    lang,
    slug
  } = params;

  const post = await getPostContent(slug, lang);

  if (!post) {
    notFound();
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
            <JsonLd data={createBlogPostStructuredData(post, lang)} />
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
    return {};
  }

  return PageMeta({
    title: post.title,
    description: post.description,
    keywords: post.keywords || `${post.title}`,
    canonicalUrl: getPostUrl(slug, lang),
    image: post.coverImage,
    imageAlt: post.title,
    type: "article",
    locale: lang === "zh" ? "zh_CN" : "en_US",
    alternateLocales: lang === "zh" ? ["en_US"] : ["zh_CN"],
    publishedDate: post.date,
    updatedDate: post.lastmod || post.date,
  });
}

export async function generateStaticParams() {
  return postSlugs.flatMap((slug) => [
    { lang: "en", slug },
    { lang: "zh", slug },
  ]);
}

export async function getPostContent(slug, lang) {
  const key = `${slug}/${lang}.md`;
  const fileContents = postsFiles[key];
  if (!fileContents) {
    console.error(`Post not found: ${key}`);
    return null;
  }

  try {
    const { data, content } = matter(fileContents);
    const contentHtml = await markdownToHtml(content);
    const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
    return {
      slug,
      contentHtml,
      coverImage: imageMatch ? imageMatch[1] : null,
      ...data,
    };
  } catch (error) {
    console.error(`Error processing post ${key}:`, error);
    return null;
  }
}

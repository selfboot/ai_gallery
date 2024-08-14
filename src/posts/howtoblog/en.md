---
title: Adding Blog Functionality
date: '2024-08-13'
tags: ['claude']
keywords: ['Claude3.5 frontend assistance', 'custom blog', 'complete blog functionality']
description: Introducing blog functionality to the site. The site itself is implemented based on Next.js. Initially, I wanted to use Nextra as a documentation blog theme, but it doesn't support Next.js App Router. With Claude's help, I eventually implemented a simple Markdown blog system that supports Github themes, multilingual switching, comments and table of contents, RSS, and is SEO-friendly. With Claude's assistance, I can add any desired functionality at any time, completely autonomously.
---

I've finally introduced blog functionality to the site. You can create Markdown articles in the `src/posts` directory, with support for multiple languages, comments, table of contents, and other features. I also experienced the joy of frontend development from scratch, and although some areas are still not perfect, it already meets basic needs.

![Site with blog functionality](https://slefboot-1251736664.file.myqcloud.com/20240814_ai_gallery_blog_cover_2.webp)

## Using an Open-Source Blog?

Initially, I wanted to use the open-source [Nextra](https://nextra.site/docs/docs-theme/start), as I liked its style and it was based on the Next.js framework. So I tried to get Claude to help me integrate Nextra into my project. After repeated struggles and trying many prompts, the solutions provided by AI didn't work.

Later, after reading the documentation, I found that my Next.js project uses App Router, which Nextra doesn't support. The official team had previously discussed not wanting to support it, so I gave up on Nextra.

Then I looked at some other React-based documentation or blog site generation components, but couldn't find one that supported internationalization and fit well with my project. I was about to give up when I decided to try asking Claude to help me implement one based on my existing setup, and surprisingly, it went quite smoothly.

## Custom Blog

With my limited frontend skills, quickly implementing a blog would have been challenging. Thankfully, with Claude's help, I quickly implemented a good prototype. Of course, when asking questions, I first explained the background and the pitfalls I had encountered. I had built a visualization site using React and Next.js 14, using App Router, and already had quite a few tools:

```shell
$ tree src
src
├── app
│   ├── [lang]
│   │   ├── algorithms
│   │   │   ├── astar
│   │   │   │   ├── content.js
│   │   │   │   └── page.js
│   │   │   ├── bfs_path
│   │   │   │   ├── content.js
│   │   │   │   └── page.js
```

Now I wanted to add a blog page that supports internationalization. My goal was to add a directory for each article, including en.md and zh.md files, which would render into well-styled pages accessible by adding 'en' or 'zh' to the link.

I considered using Nextra, but it doesn't support Next.js App Router. I asked if I could merge Nextra with my current site.

I actually wanted to use Nextra's style, and Claude provided a complete solution, saying it was possible.

> Your idea is good, integrating blog functionality into your existing visualization site is indeed a good choice. However, the incompatibility issue between Nextra and Next.js 14's App Router that you mentioned does exist. Let's explore other possible solutions to implement the blog functionality you want while maintaining compatibility with your existing App Router structure.
> Here's a possible solution that doesn't use Nextra but implements blog functionality directly in your existing Next.js 14 project.

After that, it was a process of continuous prompting, code modification, and local optimization. Finally, I implemented the current blog functionality, supporting multiple languages, comments, table of contents, RSS, and SEO.

## Comment System

First is the comment system. Although there might not be many comments, I still wanted a good one to see feedback from readers. The comment system here actually referenced the one in [Hello Algorithm](https://www.hello-algo.com/chapter_hello_algo/). When I was looking at this site, I noticed it also supports multiple languages with independent comments for each language, and the comment style is also very good.

The comment system used here is [Giscus](https://giscus.app/), which is open-source and free, requires no hosting, and can be configured directly on GitHub. The actual comments are in GitHub Discussions, making them easy to manage.

Integrating Giscus was relatively simple. I had Claude briefly summarize the integration steps, and combined with the official documentation, it was quickly implemented. Currently, it supports setting the corresponding comment language based on the current page's language selection. One thing to note is that Giscus uses zh-CN to represent Simplified Chinese, while my route only uses zh, so a mapping is needed. Claude actually discovered this and provided the code, which was very thoughtful.

## Table of Contents

Besides comments, I'm used to seeing a table of contents on the right side when reading. My [personal blog](https://selfboot.cn/) is also like this. My requirements were simple: add a table of contents on the right side for each article, support clicking on the table of contents to jump directly to the section, and highlight the current section when scrolling. It also needed to adapt to different screen sizes, with the table of contents on the right for large screens and at the beginning for small screens.

The flatterer Claude gave me a solution:

> **Your requirements are very good**. Such a table of contents (usually called TOC) can greatly improve the readability and navigation of the article. We can implement this feature by parsing the article content, extracting headings, and then creating an interactive table of contents.
> This implementation includes the following key points:
> 
> 1. The extractHeadings function is used to extract headings from Markdown content.
> 2. The TableOfContents component creates the table of contents and handles click events and scroll highlighting.
> 3. Use IntersectionObserver to detect currently visible headings and update active table of contents items.
> 4. In the BlogPost component, we extract headings and render TableOfContents.
> 5. CSS styles handle responsive layout, displaying the table of contents at the beginning of the content on small screens and on the right side on large screens.
> 6. Table of contents items are indented based on heading level, and active items are highlighted.

It seemed like this was the process, but the implementation provided wasn't perfect. Probably because the chat context was a bit long, it forgot that I was developing with Next.js, and the code provided wouldn't compile, not distinguishing between client and server rendering.

```
You're importing a component that needs useState. 
It only works in a Client Component but none of its parents are marked with "use client", 
so they're Server Components by default.
```

I directly gave this error to Claude, and it was able to help fix it quickly. Then there were other issues, such as the table of contents layout position not being quite right, being in the same block as the main text. This actually involved adjusting div blocks and changing CSS. By describing in detail the final desired result and providing relevant code, Claude was always able to quickly provide a solution.

However, there was one problem where Claude seemed to have hit a dead end. The **table of contents items didn't jump when clicked, and didn't follow the page content scrolling**. Fortunately, I had some understanding of the underlying logic for this jumping, knowing it was implemented through anchors. So I directly prompted Claude that we weren't getting the anchor now, and I suspected there was a problem with the following code:

```js
export function extractHeadings(content) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/html");
  const headings = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  return headings.map((heading) => ({
    level: parseInt(heading.tagName.charAt(1)),
    text: heading.textContent,
    slug: heading.id,
  }));
}
```

It seemed that heading.id was empty here. Then Claude realized and provided a good solution:

> You're right, the problem is that no ids are generated for headings during the Markdown to HTML conversion process. We need to modify the markdownToHtml function to add ids to headings. We can use the rehype-slug plugin to automatically generate ids for headings.

I also learned what the rehype-slug plugin does. rehype-slug is a rehype plugin mainly used to automatically add unique id attributes to heading elements (h1, h2, h3, etc.) in HTML content. This is very useful when creating tables of contents, implementing in-page navigation, or generating anchor links. It works as follows:

1. Traverses all heading elements in the HTML content.
2. For each heading without an id attribute, generates a unique ID based on the heading text.
3. Adds the generated ID to the id attribute of the heading element.

The rules for ID generation are usually as follows:

- Take the text content of the heading.
- Convert the text to lowercase.
- Remove all non-alphanumeric characters.
- Replace spaces with hyphens (-).
- If the generated ID already exists, add a number at the end to ensure uniqueness.

After introducing this, the table of contents section could jump and scroll normally. Then I manually adjusted some proportion issues and CSS details, finally implementing the table of contents functionality.

## SEO

At this point, the entire page looked good, but to make it easier for search engines to index, some SEO optimization was needed. Currently, this mainly involves setting meta tags, including title, description, keywords, etc. This is relatively simple, just add these fields in the frontmatter of each article, and then introduce them in the page. Claude quickly provided the code, which only needed a slight modification.

In fact, during the daily process of writing articles, I often ask Claude to help me write the description, saving me time from writing it myself. After setting it up, I tested it with Lighthouse, and the SEO score was pretty good.

![Blog SEO Score Test](https://slefboot-1251736664.file.myqcloud.com/20240814_ai_gallery_blog_seo_score.png)

To improve Google's indexing speed, we needed to further improve the sitemap. Actually, my demo site already supported RSS and sitemap, so we only needed to add support for the blog part. The generation of sitemap and RSS are together, so I'll talk about it all in the RSS section.

## RSS 

For the previous demo part, implemented with Next.js App Router, to support RSS and sitemap, I used some hard-coded, inelegant approaches. In the page.js of each demo page, I defined meta information, then used a JS script to parse and generate RSS and sitemap using regular expressions.

```js
try {
    const content = fs.readFileSync(page, "utf8");
    const titleMatch = content.match(/title:\s*([^,\n]+)/);
    const descriptionMatch = content.match(/description:\s*([^,\n]+)/);
    const canonicalUrlMatch = content.match(/canonicalUrl:\s*(`[^`]+`)/);
    const publishedDateMatch = content.match(/publishedDate:\s*"([^"]+)"/);
    const updatedDateMatch = content.match(/updatedDate:\s*"([^"]+)"/);
```

I couldn't think of a better way to handle this at the time, so I left it like that for now. However, when it came to the blog, we could implement it in a more elegant way. Since we define meta information directly in the frontmatter of the Markdown file, we can introduce this information in the blog page. The overall change is relatively small, just add the processing of the blog part in `scripts/generate-sitemap-rss.mjs`.

```js
const blogPosts = await globby([`src/posts/*/${lang}.md`]);

for (const post of blogPosts) {
    const content = fs.readFileSync(post, "utf8");
    const { data, content: postContent } = matter(content);
    
    const slug = path.basename(path.dirname(post));
    const url = `${DOMAIN}/${lang}/blog/${slug}`;
```

This way, the generated [sitemap](https://gallery.selfboot.cn/sitemap.xml) and [RSS](https://gallery.selfboot.cn/rss.xml) will include the content of the blog part. There are two versions of RSS here, the default rss.xml is the Chinese version, and you can use [rss-en.xml](https://gallery.selfboot.cn/rss-en.xml) to access the English version.

## The Silly Claude

The main credit for adding blog functionality goes to Claude, as most of the code was written by it. But it also tripped me up a few times, which I'll record here.

### Removing Dark Mode

When testing at night, I found that the main content of the blog automatically switched to dark mode. The entire site hadn't implemented dark mode, so the blog part turning black was extremely ugly. The theme used Github's markdown style, so it should be a Github style issue. So I asked Claude, and it gave me a bunch of complex and ineffective solutions.

For example:

> To prevent the blog content from being affected by dark mode and keep a light background with dark text, you can take the following steps:
>
> First, create a custom CSS class for your article content that will override the dark mode styles, then modify your blog post component to apply this new class.

It went on for quite a while, saying we needed to add a lot of CSS, which didn't look elegant. I was already using Tailwind, so I asked if we could **use Tailwind directly to prevent this part from appearing in dark mode without adding custom CSS**? Claude confidently gave a solution right away:

> Of course we can. Tailwind CSS provides some utility classes to control how elements behave in light/dark modes. We can use these classes to ensure the blog content always stays in light mode. Here's how to implement it:
> 
> Modify your blog post component to use Tailwind's dark: variant to override dark mode styles:...
> The key points here are:
>
> bg-white dark:bg-white: Ensures the background is white in both light and dark modes.
> 
> text-black dark:text-black: Ensures the text is black in both light and dark modes.
> 
> prose dark:prose-invert-none: If you're using Tailwind's Typography plugin, this prevents it from inverting colors in dark mode.

I implemented it as suggested, and found that it did override the black background, but the styles for quotes and code blocks were messed up. I wasn't satisfied and felt this method wasn't right, so I continued to ask **if there was a simpler way to directly disable dark mode**? Claude showed off again:

> Of course there's a simpler way to directly disable dark mode. We can achieve this by adding specific Tailwind classes to the content container after Markdown rendering.
>
> Modify your React component to add Tailwind classes to the markdown-body container to force light mode. The key here is to use the not-dark class. This class will prevent its child elements from applying dark mode styles.
>
> In your global CSS file (usually globals.css or similar), add the .not-dark class to ensure that the .not-dark container and all its child elements maintain light mode styles.

It seemed plausible, but when I tried it, it still didn't work. I was a bit frustrated, but reason told me there should be a very simple way to do this. So I looked at the CSS import part:

```jsx
@tailwind base;
@tailwind components;
@tailwind utilities;
@import 'github-markdown-css/github-markdown.css';
@import 'highlight.js/styles/github.css';
```

I wondered **if we could just use Github's light CSS here**? Claude didn't miss the opportunity to praise me (it's very good at flattery):

> **Very good idea**! You can directly import GitHub Markdown's light theme CSS in your global CSS file instead of the dark theme. This is a more concise and direct solution. Here's how to modify your CSS file:
> /* Import GitHub Markdown light theme CSS */
> 
> @import 'github-markdown-css/github-markdown-light.css';

Finally, it worked! Well, without basic frontend knowledge, I was tripped up quite a bit by this little Claude.


_Attention: Written in Chinese, translated by claude_
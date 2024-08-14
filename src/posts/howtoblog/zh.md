---
title: 支持博客功能
date: '2024-08-13'
tags: ['claude']
keywords: ['Claude3.5 辅助前端', '自定义博客', '完整博客功能']
description: 为站点引入博客功能。站点本身基于 nextjs 实现，本来想用 nextra 作为文档博客主题，但是不支持 nextjs 的 approuter。于是在 Claude 帮忙下，最终实现了一个简单的 markdown 博客系统，支持 Github 主题，多语言切换、支持评论和目录，支持 RSS 以及 SEO 友好。在 Claude 的帮助下，随时可以添加想要的功能，完全自主。
---

终于为站点引入了博客功能。可以在 `src/posts` 目录下创建 Markdown 文章，同时支持多语言，支持评论和目录以及其他功能。也体验了一把前端造轮子的乐趣，虽然有些地方还不够完善，但是已经可以满足基本需求了。

![站点引入博客功能](https://slefboot-1251736664.file.myqcloud.com/20240814_ai_gallery_blog_cover_2.webp)

## 用开源博客？

其实最开始想用开源的 [nextra](https://nextra.site/docs/docs-theme/start) 的，看了下样式挺喜欢，并且是 nextjs 框架的。于是试着让 Claude 帮我把 nextra 集成到我的项目中。中间反复折腾了许久，试了很多提示词，AI 给的方案总是不行。

后来看了下文档，发现我的 nextjs 项目采用的 App Router，而 nextra 并不支持 App Router，并且官方之前讨论过不愿意支持，就放弃了 nextra。

然后又看了其他的一些 react 下的文档或者博客站点生成组件，没有找到一个支持国际化，并且和我的项目能适配的不错的。本来都准备放弃的，最后尝试让 claude 帮我在我的基础上实现一个，没想到还挺顺利的。

## 自定义博客

以我这小白前端水平，想快速实现博客还是挺难的。好在有 Claude，在 AI 的帮助下，很快就实现了一个不错的原型。当然这里提问的时候，**先把背景我之前踩的坑都说了一遍**。我用 react 和 nextjs14 做了一个可视化站点，用的 approuter，目前有不少工具了： 

```shell
$ tree src
src
├── app
│   ├── [lang]
│   │   ├── algorithms
│   │   │   ├── astar
│   │   │   │   ├── content.js
│   │   │   │   └── page.js
│   │   │   ├── bfs_path
│   │   │   │   ├── content.js
│   │   │   │   └── page.js
```

现在想增加一个博客页面，要支持国际化。我的目标是每个文章，增加一个目录，然后在里面增加 en.md，zh.md，就能渲染出风格好的页面，然后通过在链接中添加 en 和 zh 来访问不同版本。

我考虑用 nextra 实现，但是不支持nextjs 的 approuter。我能不能把 nextra 和我现在站点融合在一起呢？

其实我这里还是想用 nextra 的样式的，Claude 回答倒是可以，直接给了一个完整的方案。

> 您的想法很好，将博客功能集成到现有的可视化站点中确实是一个不错的选择。不过，您提到的 Nextra 与 Next.js 14 的 App Router 不兼容的问题确实存在。让我们探讨一下其他可能的解决方案，以实现您想要的博客功能，同时保持与您现有的 App Router 结构兼容。
> 以下是一个可能的解决方案，不使用 Nextra，而是直接在您现有的 Next.js 14 项目中实现博客功能。

后面就是不断的提示，不断的改代码，让后局部调优了。最后就实现了目前的博客功能，支持多语言，支持评论，支持目录，支持 RSS，支持 SEO。

## 评论系统

首先是评论系统，虽然可能很少人评论，不过还是想有一个比较好些，这样才能看到读这篇文章的人的反馈。评论这里其实参考了 [Hello 算法](https://www.hello-algo.com/chapter_hello_algo/) 里的评论系统。当时在看这个站点的时候，发现他也是多语言支持，每个语言下的评论独立，评论样式也很好。

这里用的评论系统是 [giscus](https://giscus.app/)，开源并且免费，不用托管，直接在 github 上配置就行。实际评论在Github Discussions里，方便管理。

Giscus 的接入还是相对简单的，让 Claude 简单总结下接入步骤，再配合官方文档，很快就能实现。目前支持根据当前页面的语言选择来设置对应的评论语言，这里有个需要注意的点就是，Giscus 使用 zh-CN 表示简体中文，而我的路由只用了 zh，因此需要做一个映射。这个其实是 Claude 自己发现并给出代码的，很贴心。

## 目录

除了评论，我习惯在阅读的时候，看到右边有目录，我的[个人博客](https://selfboot.cn/)也是如此。我的要求也很简单，给每个文章增加一个目录在右侧，支持点击目录后直接跳过去。另外滚到到某个目录的时候，这里目录也要高亮。同时做好不同屏幕的适配，大屏幕下目录在右侧，小屏幕下目录可以在开始部分。

马屁王 Claude 给了我一个方案：

> **您的需求非常好**，这样的目录（通常称为 Table of Contents 或 TOC）可以大大提升文章的可读性和导航性。我们可以通过解析文章内容，提取标题，然后创建一个交互式的目录来实现这个功能。
> 这个实现包括以下几个关键点：
> 
> 1. extractHeadings 函数用于从 Markdown 内容中提取标题。  
> 2. TableOfContents 组件创建目录，并处理点击事件和滚动高亮。  
> 3. 使用 IntersectionObserver 来检测当前可见的标题，并更新活跃的目录项。  
> 4. 在 BlogPost 组件中，我们提取标题并渲染 TableOfContents。  
> 5. CSS 样式处理了响应式布局，在小屏幕上目录显示在内容开始部分，在大屏幕上显示在右侧。  
> 6. 目录项的缩进根据标题级别设置，活跃项会高亮显示。  

看起来是这么个流程，不过给出的实现并不完美。可能是因为聊天对话上下文有点长，它都忘了我是用 nextjs 开发，给出的代码直接编译不过，没有分清 client 还是 server 渲染。

```
You're importing a component that needs useState. 
It only works in a Client Component but none of its parents are marked with "use client", 
so they're Server Components by default.
```

这里直接把错误给 Claude，还是很快可以帮忙修复的。然后还有其他问题，比如目录布局位置不太好，和正文在一个块。这里其实是调整 div 块并且改 css 了，详细描述最终想要结果，并给出相关代码，Claude 总是能很快给出解决方案。

不过有个问题 Claude 似乎进入了死胡同。这里**目录项点击也没跳转，也没有跟随页面内容滑动**。好在我对这里跳转的底层逻辑有点了解，知道这里通过 anchor 来实现。于是就直接提示 Claude 现在没拿到 anchor，我怀疑下面代码有问题：

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

目测这里 heading.id 是空的。然后 Claude 就醒悟了，给出了不错的方案：

> 您说得对，问题出在 Markdown 转 HTML 的过程中没有为标题生成 id。我们需要修改 markdownToHtml 函数来为标题添加 id。我们可以使用 rehype-slug 插件来自动为标题生成 id。

顺便学了下 rehype-slug 插件是做什么的。rehype-slug 是一个 rehype 插件，主要用于自动为 HTML 内容中的标题元素（h1, h2, h3 等）添加唯一的 id 属性。这在创建目录、实现页内导航或生成锚点链接时非常有用。它的工作原理如下：

1. 遍历 HTML 内容中的所有标题元素。
2. 对于每个没有 id 属性的标题，生成一个基于标题文本的唯一 ID。
3. 将生成的 ID 添加到标题元素的 id 属性中。

ID 生成的规则通常如下：

- 取标题的文本内容。
- 将文本转换为小写。
- 移除所有非字母数字字符。
- 将空格替换为连字符（-）。
- 如果生成的 ID 已经存在，会在末尾添加一个数字以确保唯一性。

引入后目录部分就可以正常跳转和滚动了。接着又手工调了一些比例问题和 css 细节问题，最终实现了目录功能。

## SEO

到现在为止整个页面能看了，不过为了让搜索引擎能更好的收录，还需要做一些 SEO 优化。目前主要是 meta 标签的设置，包括 title、description、keywords 等。这里比较简单，直接在每个文章的 frontmatter 中添加这些字段，然后在页面中引入即可。Claude 很快就给出了代码，稍微改下就可以了。

其实日常写文章过程中，也会经常让 Claude 帮我写一下 description，免得自己写还需要耗时间。搞好后，用 lightouse 测试了下，SEO 分数还不错。

![博客 SEO 分数评测](https://slefboot-1251736664.file.myqcloud.com/20240814_ai_gallery_blog_seo_score.png)

为了提高 Google 的收录速度，还要接着完善下 sitemap。其实我的演示站点本来就支持 rss 和 sitemap，这里只需要新增对博客部分的支持。sitemap 和 rss 的生成部分在一起，全部在 rss 部分说吧。

## RSS 

之前的演示部分，用 nextjs 的 approuter 实现，为了支持 rss 和 sitemap，用了一些硬编码不够优雅的做法。在每个演示页面的 page.js 中定义了 meta 信息，然后用 js 脚本正则匹配解析生成 rss 和 sitemap。

```js
try {
    const content = fs.readFileSync(page, "utf8");
    const titleMatch = content.match(/title:\s*([^,\n]+)/);
    const descriptionMatch = content.match(/description:\s*([^,\n]+)/);
    const canonicalUrlMatch = content.match(/canonicalUrl:\s*(`[^`]+`)/);
    const publishedDateMatch = content.match(/publishedDate:\s*"([^"]+)"/);
    const updatedDateMatch = content.match(/updatedDate:\s*"([^"]+)"/);
```

这里暂时没想到更好的方法来处理，也就先这样了。不过到 blog 这里，就可以用更优雅的方式来实现了。因为我们是直接在 markdown 文件的 frontmatter 中定义 meta 信息，所以可以在 blog 页面中引入这个信息。整体改动比较小，直接在 `scripts/generate-sitemap-rss.mjs` 中增加 blog 部分的处理即可。

```js
const blogPosts = await globby([`src/posts/*/${lang}.md`]);

for (const post of blogPosts) {
    const content = fs.readFileSync(post, "utf8");
    const { data, content: postContent } = matter(content);
    
    const slug = path.basename(path.dirname(post));
    const url = `${DOMAIN}/${lang}/blog/${slug}`;
```

这样生成的 [sitemap]([https://gal](https://gallery.selfboot.cn/sitemap.xml)) 和 [rss](https://gallery.selfboot.cn/rss.xml) 就会包含 blog 部分的内容了。这里 rss 有两个版本，默认的 rss.xml 是中文版本，可以用 [rss-en.xml](https://gallery.selfboot.cn/rss-en.xml) 来访问英文版本。

## 笨笨的 Claude

增加博客功能主要功劳在 Claude，绝大部分代码都是他写的。但是中间也坑了我几次，这里记录一下。

### 去掉 darkmode

测试的时候，在晚上打开页面，发现博客的正文部分自动变暗色模式了。整个站点并没有实现 darkmode，博客部分这样变黑丑到爆。这里主题采用的 Github 的 markdown 样式，所以应该是 Github 的样式问题。于是问了下 Claude，他给了我一堆方案，既复杂，又不生效。

比如：

> 要让博客正文部分不受暗模式影响，保持浅色背景和深色文字，您可以采取以下步骤：
>
> 首先，为您的文章内容创建一个自定义的 CSS 类，这个类将覆盖暗模式的样式，然后，修改您的博客文章组件，应用这个新的类。

说了好长一堆，要添加好多 css，看起来就不优雅。我都用了 tailwind 了，能不能**不增加自定义 css，直接用 tailwind 来不让这部分出现暗黑模式呢**？Claude 大言不惭，上来就给出了方案：

> 当然可以。Tailwind CSS 提供了一些实用类来控制元素在明/暗模式下的行为。我们可以使用这些类来确保博客内容始终保持亮色模式。以下是如何实现：
> 
> 修改您的博客文章组件，使用 Tailwind 的 dark: 变体来覆盖暗模式样式：...
> 这里的关键点是：
>
> bg-white dark:bg-white: 确保背景在明暗模式下都是白色。
> 
> text-black dark:text-black: 确保文本在明暗模式下都是黑色。
> 
> prose dark:prose-invert-none: 如果您使用 Tailwind 的 Typography 插件，这会阻止其在暗模式下反转颜色。

照着实现了下，发现确实覆盖了黑背景，不过在引用和代码块部分样式就很乱了。我不死心，总觉得这种方法不对，于是继续问**有没有更简单的方法？直接禁用暗色模式**呢。Claude 又继续秀：

> 当然有更简单的方法直接禁用暗色模式。我们可以通过在 Markdown 渲染后的内容容器上添加特定的 Tailwind 类来实现这一点。
>
> 修改您的 React 组件，在 markdown-body 容器上添加 Tailwind 类来强制使用亮色模式。这里的关键是使用 not-dark 类。这个类会阻止其子元素应用暗色模式的样式。
>
> 在您的全局 CSS 文件（通常是 globals.css 或类似的文件）中添加 .not-dark 类，确保 .not-dark 容器及其所有子元素都保持亮色模式的样式。

看起来有点靠谱，实际试了下依然不行。有点崩溃，理智告诉我应该有一种很简单的方式就行，于是看了下这里的 css 引入部分

```jsx
@tailwind base;
@tailwind components;
@tailwind utilities;
@import 'github-markdown-css/github-markdown.css';
@import 'highlight.js/styles/github.css';
```

想着**是否可以在这里只用 github 的 light css**？Claude 不失时机的夸了我一波(很会夸人)：

> **非常好的想法**！您可以直接在全局 CSS 文件中导入 GitHub Markdown 的亮色主题 CSS，而不是暗色主题。这是一个更简洁和直接的解决方案。以下是如何修改您的 CSS 文件：
> /* 导入 GitHub Markdown 亮色主题 CSS */
> 
> @import 'github-markdown-css/github-markdown-light.css';

终于可以啦～ 嗯，没有基础前端知识，被这个小 Claude 坑的有点惨。
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";
import { visit } from "unist-util-visit";
import fs from 'fs/promises';
import path from 'path';
import matter from "gray-matter";

// 自定义插件来处理图片
function rehypeImageSize() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'img') {
        node.properties = node.properties || {};
        node.properties.style = 'max-width: 100%; max-height: 70vh; width: auto; height: auto; object-fit: contain; display: block; margin: 1rem auto;';
      }
    });
  };
}

export async function markdownToHtml(markdown) {
  const result = await remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeImageSize) 
    .use(rehypeHighlight, { ignoreMissing: true })
    .use(rehypeStringify)
    .process(markdown);
  return result.toString();
}

async function getMarkdownContent(lang, directoryPath) {
  const filePath = path.join(directoryPath, `${lang}.md`);
  try {
    const fileContents = await fs.readFile(filePath, 'utf8');
    const { data, content } = matter(fileContents);
    const contentHtml = await markdownToHtml(content);
    return {
      contentHtml,
      ...data,
    };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

export default async function BlogMarkdown({ lang, directory }) {
  const markdownContent = await getMarkdownContent(lang, directory);
  if (markdownContent) {
    return (
      <div className="mt-16">
        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: markdownContent.contentHtml }} />
      </div>
    );
  }
}
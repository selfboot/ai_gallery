import { remark } from "remark";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";
import { visit } from "unist-util-visit";
import matter from "gray-matter";
import { markdownFiles } from "@/generated/markdown-content";

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
  // directoryPath is like "src/app/[lang]/algorithms/bloomfilter"
  // We need to find the key "[lang]/algorithms/bloomfilter/zh.md" in markdownFiles
  const stripped = directoryPath.replace(/^src\/app\//, "");
  const key = `${stripped}/${lang}.md`;

  const fileContents = markdownFiles[key];
  if (!fileContents) {
    console.error(`Markdown not found for key: ${key}`);
    return null;
  }

  try {
    const { data, content } = matter(fileContents);
    const contentHtml = await markdownToHtml(content);
    return {
      contentHtml,
      ...data,
    };
  } catch (error) {
    console.error(`Error processing markdown ${key}:`, error);
    return null;
  }
}

export default async function BlogMarkdown({ lang, directory }) {
  const markdownContent = await getMarkdownContent(lang, directory);
  if (markdownContent) {
    return (
      <div className="mt-16">
        <div className="flex flex-col lg:flex-row lg:gap-8">
          <div className="w-full lg:w-4/5 lg:mr-8">
            <div className="markdown-body" dangerouslySetInnerHTML={{ __html: markdownContent.contentHtml }} />
          </div>
          {/* <div className="w-full lg:w-1/5 mt-8 lg:mt-0 lg:sticky lg:top-8">
            <SideAdComponent />
          </div> */}
        </div>
      </div>
    );
  }
}

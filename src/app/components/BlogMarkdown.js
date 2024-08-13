import { remark } from "remark";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";

export async function markdownToHtml(markdown) {
  const result = await remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeHighlight, { ignoreMissing: true })
    .use(rehypeStringify)
    .process(markdown);
  return result.toString();
}

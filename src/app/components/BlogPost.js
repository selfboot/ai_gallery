import React from "react";

export function BlogPost({ post }) {
  return (
    <article className="max-w-2xl mx-auto mt-8">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <div className="markdown-body" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
    </article>
  );
}

import React from "react";
import Link from "next/link";

export function BlogIndex({ posts, lang }) {
  return (
    <div className="max-w-2xl mx-auto mt-8">
      <h1 className="text-3xl font-bold mb-8">Blog</h1>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.slug} className="border-b pb-4">
            <Link href={`/${lang}/blog/${post.slug}`} className="text-xl font-semibold hover:text-blue-600">
              {post.title}
            </Link>
            <p className="text-gray-600 mt-1">{post.date}</p>
            {post.excerpt && <p className="mt-2">{post.excerpt}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

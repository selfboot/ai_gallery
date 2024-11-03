// src/app/components/BlogIndex.jsx
import Link from "next/link";
import { getDictionary } from "@/app/dictionaries";

export async function BlogIndex({ posts, lang }) {
  const dict = await getDictionary(lang);
  return (
    <>
      <h1 className="text-2xl font-bold mb-4">{dict.blog_title}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {posts.map((post) => (
          <Link href={`/${lang}/blog/${post.slug}`} key={post.slug} className="block">
            <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="h-48 bg-gray-200 relative">
                {post.coverImage ? (
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    loading="lazy"
                    style={{
                      position: 'absolute',
                      height: '100%',
                      width: '100%',
                      left: 0,
                      top: 0,
                      right: 0,
                      bottom: 0,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">无图片</div>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                <p className="text-gray-600 text-sm mb-2">{post.date}</p>
                <p className="text-gray-700 line-clamp-3">{post.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

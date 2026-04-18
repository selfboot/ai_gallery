"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ResponsiveWebPImage from "@/app/components/ResponseImage";
import { SideAdComponent } from "@/app/components/AdComponent";

const TAGS = ["all", "excel", "pdf", "document", "data", "finance", "image", "media", "chart", "developer"];

export default function ToolsDirectory({ lang, tools, labels }) {
  const [activeTag, setActiveTag] = useState("all");
  const [query, setQuery] = useState("");

  const tagCounts = useMemo(() => {
    const counts = { all: tools.length };
    tools.forEach((tool) => {
      (tool.tags || []).forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [tools]);

  const filteredTools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tools.filter((tool) => {
      const matchesTag = activeTag === "all" || tool.tags?.includes(activeTag);
      const searchable = `${tool.title} ${tool.description} ${tool.tags?.join(" ") || ""}`.toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      return matchesTag && matchesQuery;
    });
  }, [activeTag, query, tools]);

  return (
    <div className="mx-auto w-full">
      <section className="mb-6 border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-normal text-blue-700">{labels.kicker}</p>
            <h1 className="text-3xl font-bold text-gray-950 sm:text-4xl">{labels.title}</h1>
            <p className="mt-3 text-base leading-7 text-gray-600">{labels.subtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <div className="rounded border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs text-gray-500">{labels.totalTools}</p>
              <p className="text-2xl font-bold text-gray-950">{tools.length}</p>
            </div>
            <div className="rounded border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs text-gray-500">{labels.visibleTools}</p>
              <p className="text-2xl font-bold text-gray-950">{filteredTools.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-10 mb-6 border-b border-gray-200 bg-white/95 py-4 backdrop-blur">
        <div className="flex flex-col gap-4">
          <label className="block">
            <span className="sr-only">{labels.searchLabel}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.searchPlaceholder}
              className="w-full rounded border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {TAGS.filter((tag) => tag === "all" || tagCounts[tag]).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                className={`shrink-0 rounded border px-3 py-2 text-sm font-medium transition ${
                  activeTag === tag
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700"
                }`}
              >
                {labels.tags[tag] || tag}
                <span className={`ml-2 ${activeTag === tag ? "text-blue-100" : "text-gray-400"}`}>{tagCounts[tag] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {filteredTools.length === 0 ? (
        <div className="rounded border border-gray-200 bg-white p-8 text-center text-gray-600">{labels.empty}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTools.slice(0, 3).map((tool) => (
            <ToolCard key={tool.id} tool={tool} lang={lang} labels={labels} />
          ))}
          <div className="hidden min-h-48 overflow-hidden rounded border border-gray-200 bg-gray-50 md:block">
            <SideAdComponent format="rectangle" className="h-full min-h-48" />
          </div>
          {filteredTools.slice(3).map((tool) => (
            <ToolCard key={tool.id} tool={tool} lang={lang} labels={labels} />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolCard({ tool, lang, labels }) {
  const localizedLink = `/${lang}${tool.link}`;
  const isGif = tool.image.toLowerCase().endsWith(".gif");

  return (
    <Link
      href={localizedLink}
      className="group flex min-h-full flex-col overflow-hidden rounded border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="bg-gray-100">
        <ResponsiveWebPImage src={tool.image} alt={tool.title} isGif={isGif} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {(tool.tags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
              {labels.tags[tag] || tag}
            </span>
          ))}
        </div>
        <h2 className="text-base font-semibold leading-6 text-gray-950 group-hover:text-blue-700">{tool.title}</h2>
        <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-gray-600">{tool.description}</p>
        <div className="mt-auto pt-3 text-sm font-semibold text-blue-700">
          {labels.openTool}
          <span className="ml-1 transition group-hover:translate-x-1">→</span>
        </div>
      </div>
    </Link>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/app/i18n/client";

export function extractHeadings(content) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/html");
  const headings = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  return headings.map((heading) => ({
    level: parseInt(heading.tagName.charAt(1)),
    text: heading.textContent,
    slug:
      heading.id ||
      heading.textContent
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, ""),
  }));
}

export default function TableOfContents({ content, lang }) {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    setHeadings(extractHeadings(content));
  }, [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-50px 0px -60% 0px" }
    );

    headings.forEach(({ slug }) => {
      const element = document.getElementById(slug);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [headings]);

  const handleClick = (e, slug) => {
    e.preventDefault();
    const element = document.getElementById(slug);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const { t } = useI18n();
  return (
    <nav className="toc">
      <h2 className="text-lg font-semibold mb-4">{t("tableofcontents")}</h2>
      <ul className="space-y-2">
        {headings.map(({ level, text, slug }) => (
          <li key={slug} className={`toc-item ${level === 2 ? "pl-0" : level === 3 ? "pl-2" : "pl-4"}`}>
            <a
              href={`#${slug}`}
              onClick={(e) => handleClick(e, slug)}
              className={`block text-sm hover:text-blue-600 transition-colors ${
                activeId === slug ? "font-bold text-blue-600" : "text-gray-700"
              }`}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useI18n } from "@/app/i18n/client";
import { documentTemplates } from "../templates";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const { t } = useI18n();
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 0);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getPageNumbers = () => {
    const pages = [];
    const showPages = windowWidth < 640 ? 3 : 7;
    let start = Math.max(1, currentPage - Math.floor(showPages / 2));
    let end = Math.min(totalPages, start + showPages - 1);

    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push("...");
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-end gap-1 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-2 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed
          hover:bg-gray-100 transition-colors sm:px-3"
      >
        <ChevronLeft size={16} />
        <span className="hidden sm:inline">{t("previous")}</span>
      </button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === "..." ? (
              <span className="px-1 sm:px-2">...</span>
            ) : (
              <button
                onClick={() => page !== currentPage && onPageChange(page)}
                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md transition-colors
                  ${page === currentPage ? "bg-blue-600 text-white" : "hover:bg-gray-100"}`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-2 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed
          hover:bg-gray-100 transition-colors sm:px-3"
      >
        <span className="hidden sm:inline">{t("next")}</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

const TemplateThumbnail = ({ template, lang }) => {
  const { t } = useI18n();

  return (
    <Link href={`/${lang}/tools/gendocx/temp/${template.id}`} className="block group">
      <div className="border rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow h-full">
        <div className="aspect-[16/9] relative overflow-hidden bg-gray-50">
          <img
            src={template.previewImage}
            alt={t(template.previewImageAlt)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="p-4">
          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
            {t(template.id)}
          </h3>
        </div>
      </div>
    </Link>
  );
};

// 主组件
export default function TemplateGallery({ lang }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const { t } = useI18n();

  const templates = Object.values(documentTemplates);
  const totalPages = Math.ceil(templates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, templates.length);
  const currentTemplates = templates.slice(startIndex, endIndex);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const getItemsPerRow = useCallback((width) => {
    if (width < 640) return 2;
    if (width < 1024) return 3;
    return Math.max(1, Math.floor((width - 40) / 300));
  }, []);

  const getItemsPerPage = useCallback(
    (width) => {
      const itemsPerRow = getItemsPerRow(width);
      const viewportHeight = window.innerHeight - 300;
      const itemHeight = 280;
      const rowsPerPage = Math.max(1, Math.floor(viewportHeight / itemHeight));
      return itemsPerRow * rowsPerPage;
    },
    [getItemsPerRow]
  );

  useEffect(() => {
    if (containerWidth) {
      setItemsPerPage(getItemsPerPage(containerWidth));
    }
  }, [containerWidth, getItemsPerPage]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get("page");
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page);
      }
    }
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);

    const newUrl = new URL(window.location.href);
    if (newPage === 1) {
      newUrl.searchParams.delete("page");
    } else {
      newUrl.searchParams.set("page", newPage);
    }

    window.history.pushState({}, "", newUrl.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const pageParam = urlParams.get("page");
      const page = pageParam ? parseInt(pageParam, 10) : 1;
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const itemsPerRow = getItemsPerRow(containerWidth || 0);

  if (containerWidth === null) {
    return <div ref={containerRef} className="w-full" />;
  }

  return (
    <div ref={containerRef} className="w-full space-y-6">
      <div
        className="grid gap-4 sm:gap-6"
        style={{
          gridTemplateColumns: `repeat(${itemsPerRow}, minmax(0, 1fr))`,
        }}
      >
        {currentTemplates.map((template) => (
          <TemplateThumbnail key={template.id} template={template} lang={lang} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      )}
    </div>
  );
}

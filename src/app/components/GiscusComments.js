'use client';

import dynamic from "next/dynamic";
import React, { useEffect, useRef, useState } from "react";

const Giscus = dynamic(() => import("@giscus/react"), { ssr: false });

function GiscusComments({ lang }) {
  return (
    <Giscus
      repo="selfboot/ai_gallery"
      repoId="R_kgDOMPPfdQ"
      category="Q&A"
      categoryId="DIC_kwDOMPPfdc4Chkvp"
      mapping="pathname"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme="light"
      lang={lang}
    />
  );
}

const langMap = {
  zh: "zh-CN",
  en: "en",
};

export default function CommonComments({ lang }) {
  const containerRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) {
      return undefined;
    }

    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={containerRef} className="mt-8 min-h-24">
      {shouldLoad ? <GiscusComments lang={langMap[lang] || "en"} /> : null}
    </div>
  );
}

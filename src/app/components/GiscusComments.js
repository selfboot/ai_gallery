'use client';

import React from "react";
import Giscus from "@giscus/react";

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
  return (
    <div className="mt-8">
      <GiscusComments lang={langMap[lang] || "en"} />
    </div>
  );
}
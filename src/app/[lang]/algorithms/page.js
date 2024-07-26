import React from "react";
import ProjectGrid from "@/app/components/ProjectGrid";
import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);

  return PageMeta({
    title: dict.seo.algorithms.title,
    description: dict.seo.algorithms.description,
    keywords: dict.seo.algorithms.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms/`,
    publishedDate: "2024-07-12T02:00:00.000Z",
    updatedDate: "2024-07-12T02:00:00.000Z",
  });
}

export default async function Algorithms({ params: { lang } }) {
  const dict = await getDictionary(lang);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 px-6">{dict.algorithms}</h2>
      <ProjectGrid category="algorithms" lang={lang} />
    </div>
  );
}

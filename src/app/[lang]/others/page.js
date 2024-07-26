import React from "react";
import ProjectGrid from "@/app/components/ProjectGrid";
import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);

  return PageMeta({
    title: dict.seo.others.title,
    description: dict.seo.others.description,
    keywords: dict.seo.others.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/others/`,
    publishedDate: "2024-07-14T06:00:00.000Z",
    updatedDate: "2024-07-14T06:00:00.000Z",
  });
}

export default async function Others({ params: { lang } }) {
  const dict = await getDictionary(lang);

  return (
    <>
      <h2 className="text-xl font-bold mb-4 px-6">{dict.others}</h2>
      <ProjectGrid category="others" lang={lang} />
    </>
  );
}

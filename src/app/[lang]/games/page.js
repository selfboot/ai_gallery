import React from "react";
import ProjectGrid from "@/app/components/ProjectGrid";
import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";

export async function generateMetadata({ params: { lang } }) {
  const dict = await getDictionary(lang);

  return PageMeta({
    title: dict.seo.games.title,
    description: dict.seo.games.description,
    keywords: dict.seo.games.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/games/`,
    publishedDate: "2024-07-12T02:00:00.000Z",
    updatedDate: "2024-07-12T02:00:00.000Z",
  });
}

export default async function Games({ params: { lang } }) {
  const dict = await getDictionary(lang);

  return (
    <>
      <h2 className="text-xl font-bold mb-4">{dict.games}</h2>
      <ProjectGrid category="games" lang={lang} />
    </>
  );
}

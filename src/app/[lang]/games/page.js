import React from "react";
import ProjectGrid from "@/app/components/ProjectGrid";
import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);

  return PageMeta({
    title: dict.seo.games.title,
    description: dict.seo.games.description,
    keywords: dict.seo.games.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/games`,
    publishedDate: "2024-07-12T02:00:00.000Z",
    updatedDate: "2024-11-03T02:00:00.000Z",
  });
}

export default async function Games(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">{dict.games_title}</h1>
      <ProjectGrid category="games" lang={lang} />
    </>
  );
}

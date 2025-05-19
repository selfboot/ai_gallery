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
    title: dict.seo.tools.title,
    description: dict.seo.tools.description,
    keywords: dict.seo.tools.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/tools`,
    publishedDate: "2024-07-14T06:00:00.000Z",
    updatedDate: "2024-11-03T06:00:00.000Z",
  });
}

export default async function Tools(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">{dict.tools_title}</h1>
      <ProjectGrid category="tools" lang={lang} />
    </>
  );
}

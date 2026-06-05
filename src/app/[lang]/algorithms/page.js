import React from "react";
import ProjectGrid from "@/app/components/ProjectGrid";
import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";
import Projects from "@/app/config/project";
import DirectoryStructuredData from "@/app/components/DirectoryStructuredData";

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);

  return PageMeta({
    title: dict.seo.algorithms.title,
    description: dict.seo.algorithms.description,
    keywords: dict.seo.algorithms.keywords,
    canonicalUrl: `https://gallery.selfboot.cn/${lang}/algorithms`,
    publishedDate: "2024-07-12T02:00:00.000Z",
    updatedDate: "2024-11-03T10:00:00.000Z",
  });
}

export default async function Algorithms(props) {
  const params = await props.params;

  const {
    lang
  } = params;

  const dict = await getDictionary(lang);
  const algorithms = Projects.algorithms.map((algorithm) => ({
    ...algorithm,
    title: dict[algorithm.title] || algorithm.title,
    description: dict[algorithm.description] || algorithm.description,
  }));

  return (
    <div>
      <DirectoryStructuredData
        lang={lang}
        path={`/${lang}/algorithms`}
        title={dict.algorithms_title}
        description={dict.seo.algorithms.description}
        items={algorithms}
      />
      <h1 className="text-2xl font-bold mb-4">{dict.algorithms_title}</h1>
      <ProjectGrid category="algorithms" lang={lang} />
    </div>
  );
}

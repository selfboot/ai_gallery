import React from "react";
import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";
import Projects from "@/app/config/project";
import ToolsDirectory from "./ToolsDirectory";

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
  const tools = Projects.tools.map((tool) => ({
    ...tool,
    image: tool.images?.[lang] || tool.image,
    title: dict[tool.title] || tool.title,
    description: dict[tool.description] || tool.description,
  }));
  const labels = {
    kicker: dict.tools_directory_kicker,
    title: dict.tools_title,
    subtitle: dict.tools_directory_subtitle,
    totalTools: dict.tools_directory_total,
    visibleTools: dict.tools_directory_visible,
    searchLabel: dict.tools_directory_search_label,
    searchPlaceholder: dict.tools_directory_search_placeholder,
    empty: dict.tools_directory_empty,
    openTool: dict.tools_directory_open,
    tags: {
      all: dict.tools_tag_all,
      excel: dict.tools_tag_excel,
      pdf: dict.tools_tag_pdf,
      document: dict.tools_tag_document,
      data: dict.tools_tag_data,
      finance: dict.tools_tag_finance,
      image: dict.tools_tag_image,
      media: dict.tools_tag_media,
      chart: dict.tools_tag_chart,
      developer: dict.tools_tag_developer,
    },
  };

  return (
    <ToolsDirectory lang={lang} tools={tools} labels={labels} />
  );
}

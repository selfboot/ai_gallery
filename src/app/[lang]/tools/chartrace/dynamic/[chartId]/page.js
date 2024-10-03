import React from "react";
import { dynamicChartConfigs } from '../../dynamicChartConfigs';
import CommonComments from "@/app/components/GiscusComments";
import DynamicChart from './content';
import path from 'path';
import fs from 'fs/promises';
import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";

export async function generateStaticParams() {
  return dynamicChartConfigs.flatMap((config) => 
    ['en', 'zh'].map((lang) => ({
      lang,
      chartId: config.id,
    }))
  );
}

async function fetchChartData(dataFile) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'racechart', dataFile);
    const fileContents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error("Error loading data:", error);
    return [];
  }
}

export async function generateMetadata({ params: { chartId, lang } }) {
  const dict = await getDictionary(lang);
  const chartConfig = dynamicChartConfigs.find((c) => c.id === chartId);

  if (chartConfig) {
    return PageMeta({
      title: dict.seo.chartrace[chartId]?.title || chartConfig.title,
      description: dict.seo.chartrace[chartId]?.description || chartConfig.description,
      keywords: dict.seo.chartrace[chartId]?.keywords || chartConfig.keywords,
      canonicalUrl: `https://gallery.selfboot.cn/${lang}/tools/chartrace/dynamic/${chartId}`,
      publishedDate: chartConfig.publishedDate || "2024-10-01T02:00:00.000Z",
      updatedDate: chartConfig.updatedDate || "2024-10-03T09:00:00.000Z",
    });
  }
}

export default async function DynamicChartPage({ params }) {
  const { chartId, lang } = params;
  const config = dynamicChartConfigs.find((c) => c.id === chartId);

  if (!config) {
    return <div className="text-center py-10">Chart not found</div>;
  }

  const chartData = await fetchChartData(config.dataFile);

  return (
    <div>
      <DynamicChart config={config} initialData={chartData} />
      <CommonComments lang={lang} />
    </div>
  );
}

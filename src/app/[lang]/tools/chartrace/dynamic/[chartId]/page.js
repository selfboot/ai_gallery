import React from "react";
import { dynamicChartConfigs } from '../../dynamicChartConfigs';
import CommonComments from "@/app/components/GiscusComments";
import DynamicChart from './content';
import path from 'path';
import fs from 'fs/promises';
import { getDictionary } from "@/app/dictionaries";
import { PageMeta } from "@/app/components/Meta";
import Papa from 'papaparse';

export async function generateStaticParams() {
  return dynamicChartConfigs.flatMap((config) => 
    ['en', 'zh'].map((lang) => ({
      lang,
      chartId: config.id,
    }))
  );
}

async function fetchChartData(dataFile, config) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'racechart', dataFile);
    const content = await fs.readFile(filePath, 'utf8');
    let parsedData;

    if (dataFile.endsWith('.json')) {
      parsedData = JSON.parse(content);
    } else if (dataFile.endsWith('.csv')) {
      parsedData = Papa.parse(content, { header: true }).data;
    } else {
      throw new Error("Unsupported file format");
    }

    
    if (Array.isArray(parsedData) && parsedData.length > 1) {
      if (dataFile.endsWith('.json')) {
        return parsedData;
      }
      // 获取列名
      const headers = Object.keys(parsedData[0]);
      // 找到时间和值列的索引
      const timeIndex = headers.indexOf(config.columns.time);
      const valueIndex = headers.indexOf(config.columns.value);

      // 处理数据格式
      const processedData = parsedData.map(row => {
        const processedRow = headers.map((header, index) => {
          if (index === timeIndex || index === valueIndex) {
            return Number(row[header]);
          }
          return row[header];
        });
        return processedRow;
      });

      return [headers, ...processedData];
    } else {
      throw new Error("Invalid data format");
    }
  } catch (error) {
    console.error("Error loading data:", error);
    return null;
  }
}

export async function generateMetadata(props) {
  const params = await props.params;

  const {
    chartId,
    lang
  } = params;

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

export default async function DynamicChartPage(props) {
  const params = await props.params;
  const { chartId, lang } = params;
  const config = dynamicChartConfigs.find((c) => c.id === chartId);

  if (!config) {
    return <div className="text-center py-10">Chart not found</div>;
  }

  const chartData = await fetchChartData(config.dataFile, config);

  // console.log("chartData", chartData);
  if (!chartData) {
    return <div className="text-center py-10">Error loading chart data</div>;
  }

  return (
    <div>
      <DynamicChart config={config} initialData={chartData} />
      <CommonComments lang={lang} />
    </div>
  );
}

"use client";
import Link from 'next/link';
import { dynamicChartConfigs } from '../dynamicChartConfigs';
import { useI18n } from "@/app/i18n/client";

export default function DynamicChartsIndex() {
  const { t } = useI18n();
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-6">{t('dynamicChartsIndexTitle')}</h1>
      <p className="text-xl mb-4 text-gray-600"> {t('dynamicChartsIndexDoc')}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {dynamicChartConfigs.map((config) => (
          <Link href={`/tools/chartrace/dynamic/${config.id}`} key={config.id} 
                className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
            <h2 className="text-2xl font-semibold mb-3 text-blue-600">{config.title}</h2>
            <p className="text-gray-600 mb-4">{config.description || 'Explore this dynamic chart to uncover interesting data trends.'}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

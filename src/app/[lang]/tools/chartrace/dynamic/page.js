"use client";
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { dynamicChartConfigs } from '../dynamicChartConfigs';
import { useI18n } from "@/app/i18n/client";

export default function DynamicChartsIndex() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('All');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Get unique data sources
  const dataSources = useMemo(() => {
    return ['All', ...new Set(dynamicChartConfigs.map(config => config.dataSource || 'Unknown'))];
  }, []);

  // Filter and search configs
  const filteredConfigs = useMemo(() => {
    return dynamicChartConfigs.filter(config => 
      (selectedSource === 'All' || config.dataSource === selectedSource) &&
      (config.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (config.description && config.description.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [searchTerm, selectedSource]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredConfigs.length / itemsPerPage);

  // Paginate results
  const paginatedConfigs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredConfigs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredConfigs, currentPage, itemsPerPage]);

  // Update current page when changing items per page or when filtered results change
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, filteredConfigs.length]);

  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  return (
    <div className="container mx-auto py-4">
      <h1 className="text-4xl font-bold mb-6">{t('dynamicChartsIndexTitle')}</h1>
      <p className="text-xl mb-8 text-gray-600">{t('dynamicChartsIndexDoc')}</p>
      
      <div className="mb-4 flex justify-left items-center gap-4">
        <input
          type="text"
          placeholder="Search title or description"
          className="p-2 border rounded"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="p-2 border rounded"
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
        >
          {dataSources.map(source => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Title</th>
              <th className="py-3 px-6 text-left">Description</th>
              <th className="py-3 px-6 text-left">Data Source</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {paginatedConfigs.map((config) => (
              <tr key={config.id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  <Link href={`/tools/chartrace/dynamic/${config.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                    {config.title}
                  </Link>
                </td>
                <td className="py-3 px-6 text-left">
                  <p>{config.description || 'Explore this dynamic chart to uncover interesting data trends.'}</p>
                </td>
                <td className="py-3 px-6 text-left">
                  <p>{config.dataSource || 'Various sources'}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Next
          </button>
          <span className="self-center">Page {currentPage} of {totalPages}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select
            className="p-2 border rounded"
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
          <span>per page</span>
        </div>
      </div>
    </div>
  );
}

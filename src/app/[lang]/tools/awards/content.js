'use client';

import { useState } from 'react';
import template from './templates';

export default function GenAwards({ lang }) {
  const [textValues, setTextValues] = useState({});

  const handleExport = async () => {
    const element = document.getElementById('template-container');
    if (!element) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true
      });

      const link = document.createElement('a');
      link.download = `${template.name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (!template) return null;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">
          {template.name}生成器
        </h2>

        {/* 预览区域 */}
        <div
          id="template-container"
          className="relative bg-white shadow-lg"
          style={{
            width: '100%',
            aspectRatio: `${template.width}/${template.height}`
          }}
        >
          {/* 底图 */}
          <img
            src={template.imageUrl}
            alt={template.name}
            className="absolute top-0 left-0 w-full h-full object-contain"
          />

          {/* SVG文字层 */}
          <svg
            className="absolute top-0 left-0 w-full h-full"
            viewBox={`0 0 ${template.width} ${template.height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {template.textPositions.map(position => (
              <text
                key={position.id}
                x={position.x}
                y={position.y}
                fontSize={position.fontSize}
                fontFamily={position.fontFamily}
                fill={position.color}
                textAnchor={position.textAnchor}
                dominantBaseline="middle"
              >
                {textValues[position.id] || ''}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* 编辑表单 */}
      <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
        {template.textPositions.map(position => (
          <div key={position.id} className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {position.id}
            </label>
            <input
              type="text"
              value={textValues[position.id] || ''}
              onChange={(e) => {
                setTextValues(prev => ({
                  ...prev,
                  [position.id]: e.target.value
                }));
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}

        <button
          onClick={handleExport}
          className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          导出图片
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactECharts from 'echarts-for-react';

const DynamicChart = ({ config, initialData }) => {
  const [data, setData] = useState(initialData);
  const [chartOption, setChartOption] = useState(null);
  const [currentYearIndex, setCurrentYearIndex] = useState(0);
  const chartRef = useRef(null);

  // 生成随机颜色的函数
  const generateRandomColor = (index, total) => {
    // 使用黄金角度来分配色相，确保颜色分布均匀
    const goldenRatio = 0.618033988749895;
    const hue = ((index * goldenRatio) % 1) * 360;
    
    // 固定饱和度和亮度以确保良好的可读性
    const saturation = 70 + Math.random() * 10; // 70-80%
    const lightness = 45 + Math.random() * 10;  // 45-55%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const memoizedColorMap = useMemo(() => {
    if (!data || data.length === 0 || !config || !config.columns.type) return {};

    const typeColumn = config.columns.type;
    const types = [...new Set(data.slice(1).map(row => row[data[0].indexOf(typeColumn)]))];
    const newColorMap = {};

    types.forEach((type, index) => {
      newColorMap[type] = generateRandomColor(index, types.length);
    });

    return newColorMap;
  }, [data, config]);

  useEffect(() => {
    loadData();
  }, [config]);

  useEffect(() => {
    if (data.length > 0) {
      generateChart();
    }
  }, [data]);

  useEffect(() => {
    let animationInterval;
    if (chartOption) {
      animationInterval = setInterval(() => {
        updateChart();
      }, 500);
    }
    return () => clearInterval(animationInterval);
  }, [chartOption, currentYearIndex]);

  const loadData = async () => {
    try {
      const response = await fetch(`/racechart/${config.dataFile}`);
      const content = await response.json();
      if (Array.isArray(content) && content.length > 1) {
        setData(content);
      } else {
        throw new Error("Invalid data format");
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const generateChart = () => {
    const headers = data[0];
    const dataRows = data.slice(1);

    const timeIndex = headers.indexOf(config.columns.time);
    const typeIndex = headers.indexOf(config.columns.type);
    const valueIndex = headers.indexOf(config.columns.value);

    const years = [...new Set(dataRows.map(row => row[timeIndex]))].sort();

    const option = {
      title: {
        text: config.title,
        left: 'center',
        top: 10
      },
      grid: {
        top: 60, 
        bottom: 30,
        left: 150,
        right: 80
      },
      xAxis: {
        max: 'dataMax',
        axisLabel: {
          formatter: function (n) {
            return Math.round(n) + '';
          }
        }
      },
      yAxis: {
        type: 'category',
        inverse: true,
        max: 10,
        axisLabel: {
          show: true,
          fontSize: 14
        },
        animationDuration: 300,
        animationDurationUpdate: 300
      },
      series: [{
        realtimeSort: true,
        seriesLayoutBy: 'column',
        type: 'bar',
        encode: {
          x: valueIndex,
          y: typeIndex
        },
        label: {
          show: true,
          precision: 1,
          position: 'right',
          valueAnimation: true,
          fontFamily: 'monospace'
        },
        itemStyle: {
          color: function(params) {
            return memoizedColorMap[params.data[typeIndex]] || '#5470c6';
          }
        },
      }],
      animationDuration: 0,
      animationDurationUpdate: 2000,
      animationEasing: 'linear',
      animationEasingUpdate: 'linear',
      graphic: {
        elements: [{
          type: 'text',
          right: 160,
          bottom: 60,
          style: {
            text: years[0],
            font: 'bolder 80px monospace',
            fill: 'rgba(100, 100, 100, 0.25)'
          },
          z: 100
        }]
      }
    };

    // 设置初始数据
    const initialData = dataRows.filter(row => row[timeIndex] === years[0]);
    option.series[0].data = initialData;

    setChartOption(option);
    setCurrentYearIndex(0);
  };

  const updateChart = () => {
    if (!chartOption) return;

    const headers = data[0];
    const dataRows = data.slice(1);
    const timeIndex = headers.indexOf(config.columns.time);
    const years = [...new Set(dataRows.map(row => row[timeIndex]))].sort();

    let nextYearIndex = currentYearIndex + 1;
    if (nextYearIndex >= years.length) {
      nextYearIndex = 0; // 循环播放
    }

    const currentYear = years[nextYearIndex];
    const currentData = dataRows.filter(row => row[timeIndex] === currentYear);
    
    const updatedOption = { 
      ...chartOption,
      series: [{
        ...chartOption.series[0],
        data: currentData
      }],
      graphic: {
        elements: [{
          type: 'text',
          right: 160,
          bottom: 60,
          style: {
            text: currentYear,
            font: 'bolder 80px monospace',
            fill: 'rgba(100, 100, 100, 0.25)'
          },
          z: 100
        }]
      }
    };

    // 如果是重新开始，立即重置动画
    if (nextYearIndex === 0) {
      updatedOption.animationDurationUpdate = 0;
    } else {
      updatedOption.animationDurationUpdate = 2000; // 或者你之前设置的其他值
    }
    
    if (chartRef.current) {
      chartRef.current.getEchartsInstance().setOption(updatedOption);
    }

    // 如果是重新开始，在短暂延迟后恢复正常的动画持续时间
    if (nextYearIndex === 0) {
      setTimeout(() => {
        const resetOption = {
          animationDurationUpdate: 2000 // 或者你之前设置的其他值
        };
        chartRef.current.getEchartsInstance().setOption(resetOption);
      }, 50);
    }

    setCurrentYearIndex(nextYearIndex);
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 my-6">
        {config.title}
      </h1>
      {chartOption && (
        <div className="w-full h-[500px]">
          <ReactECharts
            ref={chartRef}
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
      )}
    </div>
  );
};

export default DynamicChart;
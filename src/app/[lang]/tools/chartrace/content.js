"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import Modal from '@/app/components/Modal';
import GIF from 'gif.js';
import * as echarts from 'echarts';
import { useI18n } from "@/app/i18n/client";
import { useParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import FileUploadBox from '@/app/components/FileUploadBox';

const ChartRace = () => {
  const { t } = useI18n();
  const params = useParams();
  const lang = params.lang;
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [columns, setColumns] = useState({ time: '', type: '', value: '' });
  const [previewData, setPreviewData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [chartOption, setChartOption] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const chartRef = useRef(null);
  const animationRef = useRef(null);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [gifProgress, setGifProgress] = useState(0);
  const [chartTitle, setChartTitle] = useState('');
  const [colorMap, setColorMap] = useState({});

  // 生成随机颜色的函数
  const generateRandomColor = (index, total) => {
    const hue = (index / total) * 360; // 均匀分布的色相
    const saturation = 70 + Math.random() * 10; // 70-80% 的饱和度
    const lightness = 50 + Math.random() * 10; // 50-60% 的亮度
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // 使用 useMemo 来缓存颜色映射
  const memoizedColorMap = useMemo(() => {
    if (data.length === 0 || !columns.type) return {};

    const typeIndex = headers.indexOf(columns.type);
    const types = [...new Set(data.map(row => row[typeIndex]))];
    const newColorMap = {};

    types.forEach((type, index) => {
      newColorMap[type] = generateRandomColor(index, types.length);
    });

    return newColorMap;
  }, [data, headers, columns.type]);

  useEffect(() => {
    setColorMap(memoizedColorMap);
  }, [memoizedColorMap]);

  const handleFileUpload = (file) => {
    if (!file) return;

    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let content = e.target.result;
        let parsedData;

        if (file.name.endsWith('.json')) {
          parsedData = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          parsedData = parseCSV(content);
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          parsedData = parseExcel(content);
        } else {
          throw new Error(t('unsupportedFileFormat'));
        }

        if (Array.isArray(parsedData) && parsedData.length > 1) {
          const headers = parsedData[0];
          const dataRows = parsedData.slice(1);
          setHeaders(headers);
          setData(dataRows);
          setPreviewData(dataRows.slice(0, 5)); // Set first 5 rows for preview
        } else {
          throw new Error(t('invalidDataFormat'));
        }
      } catch (error) {
        setModalMessage(t('parseError') + error.message);
        setIsModalOpen(true);
      }
    };

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const parseCSV = (csvContent) => {
    const lines = csvContent.split('\n');
    return lines.map(line => 
      line.split(',').map(value => value.trim())
    ).filter(row => row.length > 1 || row[0] !== '');
  };

  const parseExcel = (content) => {
    const workbook = XLSX.read(content, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  };

  const handleColumnChange = (columnType, value) => {
    setColumns(prev => ({ ...prev, [columnType]: value }));
  };

  const generateChart = () => {
    if (!columns.time || !columns.type || !columns.value) {
      setModalMessage(t('selectAllColumns'));
      setIsModalOpen(true);
      return;
    }

    // 清除之前的动画
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    const timeIndex = headers.indexOf(columns.time);
    const typeIndex = headers.indexOf(columns.type);
    const valueIndex = headers.indexOf(columns.value);

    const years = [...new Set(data.map(row => row[timeIndex]))].sort();
    const types = [...new Set(data.map(row => row[typeIndex]))];

    const option = {
      title: {
        text: chartTitle,
        left: 'center',
        top: 10
      },
      grid: {
        top: 60,  // 增加顶部边距以容纳标题
        bottom: 30,
        left: 150,
        right: 150
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
          precision: 0,
          position: 'right',
          valueAnimation: true,
          fontFamily: 'monospace'
        },
        itemStyle: {
          color: function(params) {
            return colorMap[params.data[typeIndex]] || '#5470c6';
          }
        }
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

    const processedData = uploadedFile.name.endsWith('.csv')
    ? data.map(row => {
        const newRow = [...row];
        newRow[timeIndex] = Number(row[timeIndex]);
        newRow[valueIndex] = Number(row[valueIndex]);
        return newRow;
      })
    : data;
    const initialData = processedData.filter(row => row[timeIndex] === Number(years[0]));
    // console.log("initialData", initialData);
    option.series[0].data = initialData;

    // 重置图表
    if (chartRef.current) {
      const chart = chartRef.current.getEchartsInstance();
      chart.clear();
      chart.setOption(option, true);
    }

    setChartOption(option);

    // 启动新的动画
    let currentYearIndex = 0;
    animationRef.current = setInterval(() => {
      currentYearIndex++;
      if (currentYearIndex >= years.length) {
        clearInterval(animationRef.current);
        return;
      }

      const currentYear = years[currentYearIndex];
      const currentData = data.filter(row => row[timeIndex] === currentYear);
      
      option.series[0].data = currentData;
      option.graphic.elements[0].style.text = currentYear;
      
      if (chartRef.current) {
        chartRef.current.getEchartsInstance().setOption(option);
      }
    }, 500);
  };

  const exportGif = () => {
    // console.log("开始导出 GIF");
    setIsGeneratingGif(true);
    setGifProgress(0);

    const canvasWidth = 1600;
    const canvasHeight = 1200;

    const gif = new GIF({
      workers: 4,
      quality: 10,
      width: canvasWidth,
      height: canvasHeight,
      workerScript: '/gif.worker.js'
    });

    const years = [...new Set(data.map(row => row[headers.indexOf(columns.time)]))].sort();
    const timeIndex = headers.indexOf(columns.time);
    const typeIndex = headers.indexOf(columns.type);
    const valueIndex = headers.indexOf(columns.value);

    // console.log(`总年份数: ${years.length}`);

    const yearData = years.map(year => {
      const currentData = data.filter(row => row[timeIndex] === year);
      return currentData.sort((a, b) => b[valueIndex] - a[valueIndex]).slice(0, 10);
    });

    // 创建离屏 Canvas 和 ECharts 实例
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // 填充白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const offscreenChart = echarts.init(canvas, null, { 
      renderer: 'canvas',
      width: canvasWidth,
      height: canvasHeight
    });

    // 深拷贝 chartOption 并禁用动画
    const offscreenOption = JSON.parse(JSON.stringify(chartOption));
    offscreenOption.animation = false; // 禁用动画
    offscreenOption.animationDuration = 0;
    offscreenOption.animationEasing = 'linear';
    offscreenOption.backgroundColor = '#ffffff'; // 确保背景颜色为白色
    offscreenOption.series[0].itemStyle = {
      color: function(params) {
        return colorMap[params.data[typeIndex]] || '#5470c6';
      }
    };
    // console.log("开始生成帧");

    const addFramesToGif = (index) => {
      if (index >= yearData.length) {
        // console.log("所有帧生成完毕，开始渲染 GIF");
        gif.render();
        return;
      }

      const currentData = yearData[index];
      const currentYear = years[index];
      
      offscreenOption.series[0].data = currentData;
      offscreenOption.graphic.elements[0].style.text = currentYear;
      
      offscreenChart.setOption(offscreenOption, true);
      
      // 使用离屏 Canvas 添加帧
      gif.addFrame(canvas, { delay: 500, copy: true });
      // console.log(`已生成并添加第 ${index + 1} 帧`);

      // 处理下一帧
      setTimeout(() => addFramesToGif(index + 1), 0);
    };

    // 开始添加帧
    addFramesToGif(0);

    // gif.on('start', () => console.log("GIF 渲染开始"));
    gif.on('progress', progress => {
      // console.log(`GIF 渲染进度: ${(progress * 100).toFixed(2)}%`);
      setGifProgress(progress);
    });
    gif.on('finished', blob => {
      // console.log("GIF 渲染完成，准备下载");
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const baseName = uploadedFile ? uploadedFile.name.replace(/\.[^/.]+$/, "") : 'bar-chart-race';
      link.download = `${baseName}.gif`;
      
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsGeneratingGif(false);
      offscreenChart.dispose(); // 清理离屏图表实例
      // console.log("GIF 导出完成");
    });
    // gif.on('abort', () => console.log("GIF 渲染被中止"));
    gif.on('error', error => {
      // console.error("GIF 渲染错误:", error);
      setIsGeneratingGif(false);
    });
  };

  // 组件卸载时清除动画
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row w-full space-y-4 lg:space-y-0 lg:space-x-4">
      <div className="w-full lg:w-3/4 flex flex-col">
        <FileUploadBox
          accept=".json,.csv,.xlsx,.xls"
          onChange={handleFileUpload}
          title={t('uploadChartData')}
          maxSize={100}
          className="flex-1"
        />

        {chartOption && (
          <div>
            <h2 className="font-bold mb-4">{t('raceChart')}</h2>
            <ReactECharts
              ref={chartRef}
              option={chartOption}
              style={{ height: '500px', width: '100%' }}
              notMerge={true}
              lazyUpdate={false}
            />
          </div>
        )}

        {previewData.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <h2 className="mt-4 mb-4 font-bold" >{t('dataPreview')}</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {headers.map((header, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row[cellIndex]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      <div className="w-full lg:w-1/4 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{t('time')}:</label>
          <select 
            className="w-full border border-gray-300 rounded-md p-2"
            onChange={(e) => handleColumnChange('time', e.target.value)}
            value={columns.time}
          >
            <option value="">{t('pleaseSelect')}</option>
            {headers.map((header, index) => (
              <option key={index} value={header}>{header}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{t('type')}:</label>
          <select 
            className="w-full border border-gray-300 rounded-md p-2"
            onChange={(e) => handleColumnChange('type', e.target.value)}
            value={columns.type}
          >
            <option value="">{t('pleaseSelect')}</option>
            {headers.map((header, index) => (
              <option key={index} value={header}>{header}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{t('value')}:</label>
          <select 
            className="w-full border border-gray-300 rounded-md p-2"
            onChange={(e) => handleColumnChange('value', e.target.value)}
            value={columns.value}
          >
            <option value="">{t('pleaseSelect')}</option>
            {headers.map((header, index) => (
              <option key={index} value={header}>{header}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{t('chartTitle')}:</label>
          <input 
            type="text"
            className="w-full border border-gray-300 rounded-md p-2"
            value={chartTitle}
            onChange={(e) => setChartTitle(e.target.value)}
            placeholder={t('enterChartTitle')}
          />
        </div>

        <div>
          <button 
            onClick={generateChart} 
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300"
            disabled={!headers.length}
          >
            {t('generateChart')}
          </button>
        </div>
        
        <div>
          <button 
            onClick={exportGif} 
            disabled={isGeneratingGif || !chartOption}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition duration-300 disabled:bg-gray-400"
          >
            {isGeneratingGif ? t('generatingGif') : t('exportGif')}
          </button>
        </div>
        
        {isGeneratingGif && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{width: `${gifProgress * 100}%`}}
              ></div>
            </div>
            <p className="text-center mt-2">{`${(gifProgress * 100).toFixed(0)}%`}</p>
          </div>
        )}
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <p>{modalMessage}</p>
      </Modal>
    </div>
  );
};

export default ChartRace;
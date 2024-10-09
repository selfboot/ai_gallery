import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useI18n } from "@/app/i18n/client";

const LineChart = ({ data, config }) => {
  const { t } = useI18n();
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || !config) {
      console.error('Lack of necessary data or configuration');
      return;
    }

    const chart = echarts.init(chartRef.current);

    const headers = data[0];
    let dataRows = data.slice(1);

    const timeIndex = headers.indexOf(config.columns.time);
    const typeIndex = headers.indexOf(config.columns.type);
    const valueIndex = headers.indexOf(config.columns.value);

    if (timeIndex === -1 || typeIndex === -1 || valueIndex === -1) {
      console.error('Column names in configuration do not match data');
      return;
    }

    dataRows.sort((a, b) => Number(a[timeIndex]) - Number(b[timeIndex]));

    const types = Array.from(new Set(dataRows.map(row => row[typeIndex])));
    const years = Array.from(new Set(dataRows.map(row => Number(row[timeIndex])))).sort((a, b) => a - b);

    const datasetWithFilters = [];
    const seriesList = [];

    types.forEach(type => {
      const datasetId = `dataset_${type}`;
      datasetWithFilters.push({
        id: datasetId,
        fromDatasetId: 'dataset_raw',
        transform: {
          type: 'filter',
          config: {
            and: [
              { dimension: headers[timeIndex], gte: years[0] },
              { dimension: headers[typeIndex], '=': type }
            ]
          }
        }
      });

      seriesList.push({
        type: 'line',
        datasetId: datasetId,
        showSymbol: false,
        name: type,
        endLabel: {
          show: true,
          formatter: function (params) {
            return `${type}: ${params.value[valueIndex]}`;
          }
        },
        labelLayout: {
          moveOverlap: 'shiftY'
        },
        emphasis: {
          focus: 'series'
        },
        encode: {
          x: headers[timeIndex],
          y: headers[valueIndex],
          label: [headers[typeIndex], headers[valueIndex]],
          itemName: headers[timeIndex],
          tooltip: [headers[valueIndex]]
        }
      });
    });

    const option = {
      animationDuration: 10000,
      dataset: [
        {
          id: 'dataset_raw',
          source: [headers, ...dataRows] 
        },
        ...datasetWithFilters
      ],
      title: {
        text: t('chartrace')[config.id]?.title,
        left: 'center'
      },
      tooltip: {
        order: 'valueDesc',
        trigger: 'axis'
      },

      xAxis: {
        type: 'category',
        nameLocation: 'middle'
      },
      yAxis: {
        type: 'value',
      },
      grid: {
        right: 150,
        left: '3%',
        bottom: '3%',
        containLabel: true
      },
      series: seriesList
    };

    chart.setOption(option);

    return () => {
      chart.dispose();
    };
  }, [data, config]);

  return <div ref={chartRef} style={{ width: '100%', height: '600px' }} />;
};

export default LineChart;
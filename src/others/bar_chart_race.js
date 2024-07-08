import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import Papa from 'papaparse';


const BarChartRace = () => {
  const chartRef = useRef(null);
  const [data, setData] = useState([]);
  const [years, setYears] = useState([]);
  const [currentYearIndex, setCurrentYearIndex] = useState(0);
  const updateFrequency = 2000;
  const animationId = useRef(null); // 使用 useRef 保持 animationId 的持久化

  // 处理 JSON 数据
  const processDataFromJSON = (data) => {
    const yearsData = Array.from(new Set(data.map(item => item[4])));
    return { data, years: yearsData };
  };

  // 处理 CSV 数据
  const processDataFromCSV = (result) => {
    const parsedData = result.data;
    const yearsData = Array.from(new Set(parsedData.map((item) => item[0])));
    return {
      data: parsedData.map((item) => ({
        year: item[0],
        category: item[1],
        value: item[2],
      })),
      years: yearsData,
    };
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = function (e) {
      const fileContent = e.target.result;
      if (file.name.endsWith(".json")) {
        const jsonData = JSON.parse(fileContent);
        const { data, years } = processDataFromJSON(jsonData);
        setData(data);
        setYears(years);
        setCurrentYearIndex(10);
      } else if (file.name.endsWith(".csv")) {
        Papa.parse(fileContent, {
          complete: (result) => {
            const { data, years } = processDataFromCSV(result);
            setData(data);
            setYears(years);
            setCurrentYearIndex(10);
          },
          header: false,
        });
      }
    };

    fileReader.readAsText(file);
  };

  const updateOption = useCallback(
    (startIndex) => {
      if (!chartRef.current || data.length === 0) return;
      const chartInstance = chartRef.current.getEchartsInstance();
      const year = years[startIndex];
      const source = data.slice(1).filter((d) => d[4] === year);

      chartInstance.setOption({
        yAxis: {
          data: source.map((item) => item[3]),
        },
        series: [{ data: source }],
        graphic: {
          elements: [
            {
              type: "text",
              style: {
                text: year,
              },
            },
          ],
        },
      });
    },
    [data, years]
  ); // 依赖项 data 和 years

  useEffect(() => {
    if (years.length > 0 && data.length > 0) {
      updateOption(currentYearIndex);
      clearInterval(animationId.current); // 使用 .current 访问实际的 interval ID
      animationId.current = setInterval(() => {
        // 更新 interval ID
        let newIndex = currentYearIndex + 1;
        if (newIndex >= years.length) newIndex = 10; // 循环显示
        setCurrentYearIndex(newIndex);
        updateOption(newIndex);
      }, 1000);
    }

    return () => clearInterval(animationId.current); // 清理时也需要使用 .current
  }, [currentYearIndex, data, years, updateOption]);

  return (
    <div>
      <input type="file" onChange={handleFileUpload} />
      <ReactECharts
        ref={chartRef}
        option={{
          grid: { top: 10, bottom: 30, left: 150, right: 80 },
          xAxis: {
            max: "dataMax",
            axisLabel: { formatter: (n) => Math.round(n).toString() },
          },
          yAxis: {
            type: "category",
            inverse: true,
            max: 10,
            animationDuration: 300,
            animationDurationUpdate: 300,
          },
          series: [
            {
              type: "bar",
              realtimeSort: true,
              seriesLayoutBy: "column",
              itemStyle: {
                color: "#5470c6",
              },
              encode: { x: 0, y: 3 },
              label: {
                show: true,
                precision: 1,
                position: "right",
                valueAnimation: true,
                fontFamily: "monospace",
              },
            },
          ],
          animationDuration: 0,
          animationDurationUpdate: updateFrequency,
          animationEasing: "linear",
          animationEasingUpdate: "linear",
        }}
        style={{ height: 400 }}
      />
    </div>
  );
};

export default BarChartRace;

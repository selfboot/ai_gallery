export const dynamicChartConfigs = [
  {
    id: 'population-growth',
    title: 'World Population Growth',
    dataFile: 'life-expectancy-table.json',
    columns: {
      time: 'Year',
      type: 'Country',
      value: 'Population'
    }
  },
  {
    id: 'income-growth',
    title: 'Income Growth by Country',
    dataFile: 'life-expectancy-table.json',
    columns: {
      time: 'Year',
      type: 'Country',
      value: 'Income'
    }
  },
  // 添加更多动态图配置...
];

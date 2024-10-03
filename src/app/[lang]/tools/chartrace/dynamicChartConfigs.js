const dynamicChartConfigs = [
  {
    id: 'population-growth',
    dataFile: 'life-expectancy-table.json',
    columns: {
      time: 'Year',
      type: 'Country',
      value: 'Population'
    },
    publishedDate: "2024-10-01T02:00:00.000Z",
    updatedDate: "2024-10-03T09:00:00.000Z",
    dataSource: "Echarts"
  },
  {
    id: 'income-growth',
    dataFile: 'life-expectancy-table.json',
    columns: {
      time: 'Year',
      type: 'Country',
      value: 'Income'
    },
    publishedDate: "2024-10-01T02:00:00.000Z",
    updatedDate: "2024-10-03T09:00:00.000Z",
    dataSource: "Echarts"
  },
];

module.exports = { dynamicChartConfigs };

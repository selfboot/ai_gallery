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
    dataSource: "Echarts",
    max: -1,
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
    dataSource: "Echarts",
    max: -1,
  },
  {
    id: 'china_gdp',
    dataFile: 'china_gdp.csv',
    columns: {
      time: 'Year',
      type: 'Region',
      value: 'GDP'
    },
    publishedDate: "2024-10-06T02:00:00.000Z",
    updatedDate: "2024-10-06T09:00:00.000Z",
    dataSource: "NationalData",
    max: -1,
    yearInterval: 1000
  },
];

module.exports = { dynamicChartConfigs };

"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactECharts from "echarts-for-react";
import * as XLSX from "xlsx";

export default function LoanRateCalculator() {
  // 状态管理
  const [rate, setRate] = useState(3.35);
  const [amount, setAmount] = useState(1000000);
  const [months, setMonths] = useState(360);
  const [results, setResults] = useState(null);
  const [chartOptions, setChartOptions] = useState(null);

  // 计算结果
  const calculateLoan = () => {
    if (!amount || !rate || !months) return;

    // 计算不同利率下的结果
    const calculateForRate = (currentRate) => {
      const monthlyRate = currentRate / 100 / 12;

      // 等额本息
      const equalPayment =
        (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
      const roundedEqualPayment = Math.round(equalPayment * 100) / 100;

      // 计算等额本息每月的本金和利息
      let equalPaymentDetails = [];
      let remainingEqualPayment = amount;
      let equalPaymentTotalInterest = 0;

      for (let i = 0; i < months; i++) {
        const interest = Math.round(remainingEqualPayment * monthlyRate * 100) / 100;
        const principal = Math.round((roundedEqualPayment - interest) * 100) / 100;
        // 处理最后一个月的舍入误差
        const actualPrincipal = i === months - 1 ? remainingEqualPayment : principal;
        const actualPayment =
          i === months - 1 ? Math.round((actualPrincipal + interest) * 100) / 100 : roundedEqualPayment;

        equalPaymentDetails.push({
          month: i + 1,
          payment: actualPayment,
          principal: actualPrincipal,
          interest: interest,
        });

        remainingEqualPayment = Math.round((remainingEqualPayment - actualPrincipal) * 100) / 100;
        equalPaymentTotalInterest += interest;
      }

      // 等额本金
      const principalPerMonth = Math.round((amount / months) * 100) / 100;
      let equalPrincipalPayments = [];
      let equalPrincipalTotalInterest = 0;
      let remainingAmount = amount;

      for (let i = 0; i < months; i++) {
        const monthlyPrincipal = i === months - 1 ? remainingAmount : principalPerMonth;
        remainingAmount = Math.round((remainingAmount - monthlyPrincipal) * 100) / 100;

        const interest = Math.round(remainingAmount * monthlyRate * 100) / 100;
        equalPrincipalTotalInterest += interest;

        const monthlyPayment = Math.round((monthlyPrincipal + interest) * 100) / 100;
        equalPrincipalPayments.push({
          month: i + 1,
          payment: monthlyPayment,
          principal: monthlyPrincipal,
          interest: interest,
        });
      }

      // 先息后本
      const interestOnlyPayment = Math.round(amount * monthlyRate * 100) / 100;
      const interestOnlyTotalInterest = interestOnlyPayment * months;

      let interestOnlyPayments = [];
      for (let i = 0; i < months; i++) {
        if (i < months - 1) {
          interestOnlyPayments.push({
            month: i + 1,
            payment: interestOnlyPayment,
            principal: 0,
            interest: interestOnlyPayment,
          });
        } else {
          // 最后一个月还本金
          interestOnlyPayments.push({
            month: i + 1,
            payment: Math.round((amount + interestOnlyPayment) * 100) / 100,
            principal: amount,
            interest: interestOnlyPayment,
          });
        }
      }

      return {
        equalPayment: roundedEqualPayment,
        equalPaymentTotalInterest: equalPaymentTotalInterest,
        equalPaymentDetails: equalPaymentDetails,
        equalPrincipalFirstPayment: equalPrincipalPayments[0].payment,
        equalPrincipalLastPayment: equalPrincipalPayments[equalPrincipalPayments.length - 1].payment,
        equalPrincipalPayments: equalPrincipalPayments,
        equalPrincipalTotalInterest: equalPrincipalTotalInterest,
        interestOnlyPayment: interestOnlyPayment,
        interestOnlyPayments: interestOnlyPayments,
        interestOnlyTotalInterest: interestOnlyTotalInterest,
      };
    };

    // 计算三种利率情况
    const baseResult = calculateForRate(rate);
    const lowerResult = calculateForRate(rate - 0.5);
    const higherResult = calculateForRate(rate + 0.5);

    setResults({
      base: baseResult,
      lower: lowerResult,
      higher: higherResult,
    });

    // 准备ECharts折线图数据，利率上下浮动2个点，步长0.1
    const ratePoints = [];
    const equalPaymentInterests = [];
    const equalPrincipalInterests = [];
    const interestOnlyInterests = [];

    // 生成利率点和对应的利息数据
    for (let i = -20; i <= 20; i++) {
      const currentRate = rate + i * 0.1;
      ratePoints.push(currentRate.toFixed(1) + "%");

      const result = calculateForRate(currentRate);
      equalPaymentInterests.push(result.equalPaymentTotalInterest);
      equalPrincipalInterests.push(result.equalPrincipalTotalInterest);
      interestOnlyInterests.push(result.interestOnlyTotalInterest);
    }

    setChartOptions({
      tooltip: {
        trigger: "axis",
        formatter: function (params) {
          let result = params[0].name + "<br/>";
          params.forEach((param) => {
            result += param.seriesName + ": " + formatNumber(param.value) + "元<br/>";
          });
          return result;
        },
      },
      legend: {
        data: ["等额本息总利息", "等额本金总利息", "先息后本总利息"],
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: ratePoints,
        axisLabel: {
          interval: 4, // 每隔4个显示一个标签
          rotate: 45, // 标签旋转45度
        },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: function (value) {
            if (value >= 10000) {
              return value / 10000 + "万";
            }
            return value;
          },
        },
      },
      series: [
        {
          name: "等额本息总利息",
          type: "line",
          data: equalPaymentInterests,
          smooth: true,
          symbol: "circle",
          symbolSize: 5,
          itemStyle: {
            color: "#3B82F6",
          },
          lineStyle: {
            width: 2,
          },
          emphasis: {
            focus: "series",
          },
        },
        {
          name: "等额本金总利息",
          type: "line",
          data: equalPrincipalInterests,
          smooth: true,
          symbol: "circle",
          symbolSize: 5,
          itemStyle: {
            color: "#EF4444",
          },
          lineStyle: {
            width: 2,
          },
          emphasis: {
            focus: "series",
          },
        },
        {
          name: "先息后本总利息",
          type: "line",
          data: interestOnlyInterests,
          smooth: true,
          symbol: "circle",
          symbolSize: 5,
          itemStyle: {
            color: "#10B981",
          },
          lineStyle: {
            width: 2,
          },
          emphasis: {
            focus: "series",
          },
        },
      ],
    });
  };

  // 导出Excel
  const exportToExcel = () => {
    if (!results) return;

    const workbook = XLSX.utils.book_new();

    // 详细还款计划表
    const detailedData = [
      [
        "月份",
        "等额本息-本金",
        "等额本息-利息",
        "等额本息-月供",
        "等额本金-本金",
        "等额本金-利息",
        "等额本金-月供",
        "先息后本-本金",
        "先息后本-利息",
        "先息后本-月供",
      ],
    ];

    for (let i = 0; i < months; i++) {
      detailedData.push([
        i + 1,
        results.base.equalPaymentDetails[i].principal.toFixed(2),
        results.base.equalPaymentDetails[i].interest.toFixed(2),
        results.base.equalPaymentDetails[i].payment.toFixed(2),
        results.base.equalPrincipalPayments[i].principal.toFixed(2),
        results.base.equalPrincipalPayments[i].interest.toFixed(2),
        results.base.equalPrincipalPayments[i].payment.toFixed(2),
        results.base.interestOnlyPayments[i].principal.toFixed(2),
        results.base.interestOnlyPayments[i].interest.toFixed(2),
        results.base.interestOnlyPayments[i].payment.toFixed(2),
      ]);
    }

    // 简化后的汇总表，只包含输入利率的结果
    const summaryData = [
      ["还款方式", "月供(元)", "总利息(元)", "总还款(元)"],
      [
        "等额本息",
        results.base.equalPayment.toFixed(2),
        results.base.equalPaymentTotalInterest.toFixed(2),
        (results.base.equalPayment * months).toFixed(2),
      ],
      [
        "等额本金(首月)",
        results.base.equalPrincipalFirstPayment.toFixed(2),
        results.base.equalPrincipalTotalInterest.toFixed(2),
        (results.base.equalPrincipalTotalInterest + amount).toFixed(2),
      ],
      [
        "先息后本",
        results.base.interestOnlyPayment.toFixed(2) +
          "(前" +
          (months - 1) +
          "月)," +
          (results.base.interestOnlyPayment + amount).toFixed(2) +
          "(最后1月)",
        results.base.interestOnlyTotalInterest.toFixed(2),
        (results.base.interestOnlyTotalInterest + amount).toFixed(2),
      ],
    ];

    const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    XLSX.utils.book_append_sheet(workbook, summarySheet, "汇总");
    XLSX.utils.book_append_sheet(workbook, detailedSheet, "详细还款计划");

    XLSX.writeFile(workbook, "贷款计算结果.xlsx");
  };

  // 初始计算
  useEffect(() => {
    calculateLoan();
  }, []);

  // 格式化数字为千分位
  const formatNumber = (num) => {
    return new Intl.NumberFormat("zh-CN").format(num.toFixed(2));
  };

  return (
    <div className="w-full mx-auto mt-4">
      {/* 输入表单 */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">年化利率 (%)</label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="3.35"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">贷款金额 (元)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">还款期数 (月)</label>
            <input
              type="number"
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="360"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={calculateLoan}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            计算
          </button>
        </div>
      </div>

      {results && (
        <>
          {/* 图表展示 - 使用ECharts替换Chart.js */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">不同利率下的总利息对比</h2>
            <div className="h-80">
              {chartOptions && <ReactECharts option={chartOptions} style={{ height: "100%", width: "100%" }} />}
            </div>
          </div>

          {/* 详细还款计划 - 合并表格 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">详细还款计划</h2>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                导出Excel
              </button>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      月份
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      colSpan="3"
                    >
                      等额本息
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      colSpan="3"
                    >
                      等额本金
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      colSpan="3"
                    >
                      先息后本
                    </th>
                  </tr>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      本金
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      利息
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      月供
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      本金
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      利息
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      月供
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      本金
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      利息
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      月供
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.base.equalPaymentDetails.slice(0, 12).map((_, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 whitespace-nowrap">{index + 1}</td>
                      {/* 等额本息 */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatNumber(results.base.equalPaymentDetails[index].principal)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatNumber(results.base.equalPaymentDetails[index].interest)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatNumber(results.base.equalPaymentDetails[index].payment)}
                      </td>
                      {/* 等额本金 */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatNumber(results.base.equalPrincipalPayments[index].principal)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatNumber(results.base.equalPrincipalPayments[index].interest)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatNumber(results.base.equalPrincipalPayments[index].payment)}
                      </td>
                      {/* 先息后本 */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatNumber(results.base.interestOnlyPayments[index].principal)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatNumber(results.base.interestOnlyPayments[index].interest)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatNumber(results.base.interestOnlyPayments[index].payment)}
                      </td>
                    </tr>
                  ))}
                  {months > 12 && (
                    <tr>
                      <td colSpan="10" className="px-3 py-2 text-center text-gray-500">
                        ... 更多月份数据请导出Excel查看 ...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

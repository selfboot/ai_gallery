"use client";

import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import * as XLSX from "xlsx";
import { useI18n } from "@/app/i18n/client";

export default function LoanRateCalculator() {
  const { t, dictionary } = useI18n();
  
  // 直接从字典中获取loanrate对象
  const loanDict = dictionary.loanrate || {};
  const tLoan = (key) => loanDict[key] || key;
  
  const [rate, setRate] = useState(3.35);
  const [amount, setAmount] = useState(1000000);
  const [months, setMonths] = useState(360);
  const [results, setResults] = useState(null);
  const [chartOptions, setChartOptions] = useState(null);

  // 等额本息计算函数
  const calculateEqualPayment = (principal, monthlyRate, term) => {
    // 1. 计算精确的理论月供 (不舍入)
    const preciseEqualPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);

    // 2. 确定实际的、舍入后的月供 (用于除最后一期外的支付)
    const actualMonthlyPayment = Math.round(preciseEqualPayment * 100) / 100;

    let equalPaymentDetails = [];
    let remainingBalance = principal; // 使用精确的剩余本金进行迭代
    let totalInterestPaid = 0;
    let totalAmountPaid = 0;

    for (let i = 0; i < term; i++) {
      // 3. 基于当前精确的剩余本金计算当期利息
      const interestThisMonth = remainingBalance * monthlyRate;
      // 舍入当期利息 (到分，用于明细和计算本金)
      const roundedInterestThisMonth = Math.round(interestThisMonth * 100) / 100;

      let principalThisMonth;
      let paymentThisMonth;

      if (i < term - 1) {
        // 4. 非最后一期
        paymentThisMonth = actualMonthlyPayment;
        // 当期本金 = 实际月供 - 当期舍入后利息
        principalThisMonth = Math.round((paymentThisMonth - roundedInterestThisMonth) * 100) / 100;

        // 确保计算出的本金不会超过剩余本金 (处理极端情况或潜在的舍入问题)
        if (principalThisMonth > remainingBalance) {
          // 理论上，如果 actualMonthlyPayment >= roundedInterestThisMonth，这里不应发生
          // 但作为保险措施，如果发生，则本金最多是剩余本金
          console.warn("Principal calculation adjusted in month", i + 1);
          principalThisMonth = Math.round(remainingBalance * 100) / 100;
          // 相应调整支付额，但这通常表示输入有问题或利率极低
          paymentThisMonth = Math.round((principalThisMonth + roundedInterestThisMonth) * 100) / 100;
        }
      } else {
        // 5. 最后一期
        // 本金等于所有剩余金额
        principalThisMonth = Math.round(remainingBalance * 100) / 100;
        // 最后一期实际支付 = 剩余本金 + 最后一期利息
        paymentThisMonth = Math.round((principalThisMonth + roundedInterestThisMonth) * 100) / 100;
      }

      // 6. 更新精确的剩余本金
      // 使用减法更新，避免浮点数误差累积，虽然理论上 principalThisMonth 已处理过
      remainingBalance = Math.round((remainingBalance - principalThisMonth) * 100) / 100;
      // 如果非常接近0，则直接设为0
      if (Math.abs(remainingBalance) < 0.001) {
        remainingBalance = 0;
      }
      // 对最后一期后强制清零，防止极小的残留值
      if (i === term - 1) {
        remainingBalance = 0;
      }

      // 7. 累加总额 (使用当期计算出的实际值)
      totalInterestPaid += roundedInterestThisMonth;
      totalAmountPaid += paymentThisMonth;

      // 8. 存储当期明细
      equalPaymentDetails.push({
        month: i + 1,
        payment: paymentThisMonth,
        principal: principalThisMonth,
        interest: roundedInterestThisMonth,
      });
    }

    // 9. 对累加的总额进行最后舍入，以防累加过程中的浮点误差
    totalInterestPaid = Math.round(totalInterestPaid * 100) / 100;
    totalAmountPaid = Math.round(totalAmountPaid * 100) / 100;

    return {
      equalPayment: actualMonthlyPayment,
      equalPaymentTotalInterest: totalInterestPaid,
      equalPaymentTotalAmount: totalAmountPaid,
      equalPaymentDetails: equalPaymentDetails,
    };
  };

  // 等额本金计算函数
  const calculateEqualPrincipal = (principal, monthlyRate, term) => {
    const principalPerMonth = Math.round((principal / term) * 100) / 100;
    let equalPrincipalPayments = [];
    let equalPrincipalTotalInterest = 0;
    let remainingAmount = principal;

    for (let i = 0; i < term; i++) {
      // 先计算当月利息（基于当前剩余本金）
      const interest = Math.round(remainingAmount * monthlyRate * 100) / 100;
      equalPrincipalTotalInterest += interest;

      // 确定当月还款本金
      const monthlyPrincipal = i === term - 1 ? remainingAmount : principalPerMonth;
      
      // 计算当月总还款额
      const monthlyPayment = Math.round((monthlyPrincipal + interest) * 100) / 100;
      
      // 更新剩余本金
      remainingAmount = Math.round((remainingAmount - monthlyPrincipal) * 100) / 100;

      equalPrincipalPayments.push({
        month: i + 1,
        payment: monthlyPayment,
        principal: monthlyPrincipal,
        interest: interest,
      });
    }

    // 确保总利息四舍五入到分
    equalPrincipalTotalInterest = Math.round(equalPrincipalTotalInterest * 100) / 100;

    return {
      equalPrincipalFirstPayment: equalPrincipalPayments[0].payment,
      equalPrincipalLastPayment: equalPrincipalPayments[equalPrincipalPayments.length - 1].payment,
      equalPrincipalTotalInterest: equalPrincipalTotalInterest,
      equalPrincipalPayments: equalPrincipalPayments,
    };
  };

  // 先息后本计算函数
  const calculateInterestOnly = (principal, monthlyRate, term) => {
    const interestOnlyPayment = Math.round(principal * monthlyRate * 100) / 100;
    const interestOnlyTotalInterest = interestOnlyPayment * term;

    let interestOnlyPayments = [];
    for (let i = 0; i < term; i++) {
      if (i < term - 1) {
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
          payment: Math.round((principal + interestOnlyPayment) * 100) / 100,
          principal: principal,
          interest: interestOnlyPayment,
        });
      }
    }

    return {
      interestOnlyPayment: interestOnlyPayment,
      interestOnlyTotalInterest: interestOnlyTotalInterest,
      interestOnlyPayments: interestOnlyPayments,
    };
  };

  // 计算结果
  const calculateLoan = () => {
    if (!amount || !rate || !months) return;

    // 计算不同利率下的结果
    const calculateForRate = (currentRate) => {
      const monthlyRate = currentRate / 100 / 12;

      // 调用三种还款方式的计算函数
      const equalPaymentResults = calculateEqualPayment(amount, monthlyRate, months);
      const equalPrincipalResults = calculateEqualPrincipal(amount, monthlyRate, months);
      const interestOnlyResults = calculateInterestOnly(amount, monthlyRate, months);

      // 返回合并结果
      return {
        ...equalPaymentResults,
        ...equalPrincipalResults,
        ...interestOnlyResults,
      };
    };

    // 计算三种利率情况
    const baseResult = calculateForRate(rate);
    setResults({
      base: baseResult
    });

    // 准备ECharts折线图数据，利率上下浮动2个点，步长0.05
    const ratePoints = [];
    const equalPaymentInterests = [];
    const equalPrincipalInterests = [];
    const interestOnlyInterests = [];

    // 生成利率点和对应的利息数据（固定区间2.0%到6.0%，步长0.05）
    for (let currentRate = 2.0; currentRate <= 6.0; currentRate += 0.05) {
      // 保留两位小数
      const fixedRate = Math.round(currentRate * 100) / 100;
      ratePoints.push(fixedRate.toFixed(2) + "%");

      const result = calculateForRate(fixedRate);
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
            result += param.seriesName + ": " + formatNumber(param.value) + "<br/>";
          });
          return result;
        },
      },
      legend: {
        data: [tLoan("equalPaymentTotalInterest"), tLoan("equalPrincipalTotalInterest"), tLoan("interestOnlyTotalInterest")],
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
          name: tLoan("equalPaymentTotalInterest"),
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
          name: tLoan("equalPrincipalTotalInterest"),
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
          name: tLoan("interestOnlyTotalInterest"),
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
        tLoan("month"),
        tLoan("equalPaymentPrincipal"),
        tLoan("equalPaymentInterest"),
        tLoan("equalPaymentMonthly"),
        tLoan("equalPrincipalPrincipal"),
        tLoan("equalPrincipalInterest"),
        tLoan("equalPrincipalMonthly"),
        tLoan("interestOnlyPrincipal"),
        tLoan("interestOnlyInterest"),
        tLoan("interestOnlyMonthly"),
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
      [tLoan("repaymentMethod"), tLoan("monthlyPayment"), tLoan("totalInterest"), tLoan("totalRepayment")],
      [
        tLoan("equalPayment"),
        results.base.equalPayment.toFixed(2),
        results.base.equalPaymentTotalInterest.toFixed(2),
        results.base.equalPaymentTotalAmount.toFixed(2),
      ],
      [
        tLoan("equalPrincipalFirstMonth"),
        results.base.equalPrincipalFirstPayment.toFixed(2),
        results.base.equalPrincipalTotalInterest.toFixed(2),
        (results.base.equalPrincipalTotalInterest + amount).toFixed(2),
      ],
      [
        tLoan("interestOnlyPayment"),
        results.base.interestOnlyPayment.toFixed(2) +
          "(" + tLoan("first") + (months - 1) + tLoan("months") + ")," +
          (results.base.interestOnlyPayment + amount).toFixed(2) +
          "(" + tLoan("lastMonth") + ")",
        results.base.interestOnlyTotalInterest.toFixed(2),
        (results.base.interestOnlyTotalInterest + amount).toFixed(2),
      ],
    ];

    const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    XLSX.utils.book_append_sheet(workbook, summarySheet, tLoan("summary"));
    XLSX.utils.book_append_sheet(workbook, detailedSheet, tLoan("detailedPlan"));

    XLSX.writeFile(workbook, tLoan("loanCalculationResult"));
  };

  // 初始计算
  useEffect(() => {
    calculateLoan();
  }, []);

  // 格式化数字为千分位
  const formatNumber = (num) => {
    // 根据t对象判断当前语言类型
    const isZh = dictionary.loanrate?.yuan === "元";
    const currencySuffix = isZh ? "元" : "";
    
    // 根据语言选择格式化方式
    const locale = isZh ? "zh-CN" : "en-US";
    return new Intl.NumberFormat(locale).format(num.toFixed(2)) + currencySuffix;
  };

  return (
    <div className="w-full mx-auto mt-4">
      {/* 输入表单 */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{tLoan("yearlyInterestRate")}</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">{tLoan("loanAmount")}</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{tLoan("repaymentPeriods")}</label>
            <input
              type="number"
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="360"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row justify-end items-center gap-4">
          {results && (
            <div className="text-sm text-gray-700 w-full md:w-auto md:mr-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6">
                <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 text-center shadow-sm">
                  <div className="text-blue-700 font-semibold">
                    {tLoan("equalPaymentInterest")} {formatNumber(results.base.equalPaymentTotalInterest)}
                  </div>
                </div>
                <div className="bg-red-50 p-2 rounded-lg border border-red-100 text-center shadow-sm">
                  <div className="text-red-700 font-semibold">
                    {tLoan("equalPrincipalInterest")} {formatNumber(results.base.equalPrincipalTotalInterest)}
                  </div>
                </div>
                <div className="bg-green-50 p-2 rounded-lg border border-green-100 text-center shadow-sm">
                  <div className="text-green-700 font-semibold">
                    {tLoan("interestOnlyInterest")} {formatNumber(results.base.interestOnlyTotalInterest)}
                  </div>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={calculateLoan}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full md:w-auto"
          >
            {tLoan("calculate")}
          </button>
        </div>
      </div>

      {results && (
        <>
          {/* 图表展示 - 使用ECharts替换Chart.js */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">{tLoan("interestComparisonChart")}</h2>
            <div className="h-80">
              {chartOptions && <ReactECharts option={chartOptions} style={{ height: "100%", width: "100%" }} />}
            </div>
          </div>

          {/* 详细还款计划 - 合并表格 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{tLoan("detailedRepaymentPlan")}</h2>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {tLoan("exportExcel")}
              </button>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tLoan("month")}
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      colSpan="3"
                    >
                      {tLoan("equalPayment")}
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      colSpan="3"
                    >
                      {tLoan("equalPrincipal")}
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      colSpan="3"
                    >
                      {tLoan("interestOnly")}
                    </th>
                  </tr>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tLoan("principal")}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tLoan("interest")}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tLoan("monthlyPayment")}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tLoan("principal")}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tLoan("interest")}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tLoan("monthlyPayment")}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tLoan("principal")}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tLoan("interest")}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tLoan("monthlyPayment")}
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
                        {tLoan("moreDataInExcel")}
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

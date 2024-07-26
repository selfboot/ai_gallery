"use client";

import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { useI18n } from "@/app/i18n/client";

const RateLimiter = () => {
  const [requests, setRequests] = useState(Array(10).fill(0));
  const [slidingWindowResults, setSlidingWindowResults] = useState(
    Array(10).fill(0)
  );
  const [fixedWindowResults, setFixedWindowResults] = useState(
    Array(10).fill(0)
  );
  const [rateLimit, setRateLimit] = useState(20);
  const { t } = useI18n();

  const generateRandomRequests = () => {
    const newRequests = Array(10)
      .fill(0)
      .map(() => Math.floor(Math.random() * 15));
    setRequests(newRequests);
  };

  useEffect(() => {
    const calculateSlidingWindowResults = () => {
      let newResults = [...requests];
      let windowSum = 0;
      let windowQueue = [];
      for (let i = 0; i < 10; i++) {
        while (windowQueue.length > 0 && windowQueue[0].index <= i - 5) {
          windowSum -= windowQueue.shift().count;
        }
        let acceptedRequests = Math.min(requests[i], rateLimit - windowSum);
        newResults[i] = acceptedRequests;
        windowSum += acceptedRequests;
        windowQueue.push({ index: i, count: acceptedRequests });
      }
      setSlidingWindowResults(newResults);
    };

    const calculateFixedWindowResults = () => {
      let newResults = [...requests];
      let windowSum = 0;
      for (let i = 0; i < 10; i++) {
        if (i % 5 === 0) windowSum = 0;
        let acceptedRequests = Math.min(requests[i], rateLimit - windowSum);
        newResults[i] = acceptedRequests;
        windowSum += acceptedRequests;
      }
      setFixedWindowResults(newResults);
    };

    calculateSlidingWindowResults();
    calculateFixedWindowResults();
  }, [requests, rateLimit]);

  const option = {
    title: {
      text: t("rate_limit_compare"),
      left: "center",
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      formatter: function (params) {
        const timeRange = `${params[0].name}ms - ${
          parseInt(params[0].name) + 200
        }ms`;
        let result = `${timeRange}<br/>${t("total_request")}: ${
          params[0].value + params[1].value
        }<br/>`;
        params.forEach((param) => {
          result += `${param.seriesName}: ${param.value}<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: [
        t("sliding_window_success"),
        t("sliding_window_fail"),
        t("fixed_window_success"),
        t("fixed_window_fail"),
      ],
      bottom: 0,
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: requests.map((_, index) => `${index * 200}`),
      axisLabel: {
        formatter: "{value}ms",
      },
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        name: t("sliding_window_success"),
        type: "bar",
        stack: "sliding",
        data: slidingWindowResults,
        itemStyle: { color: "#4ade80" },
      },
      {
        name: t("sliding_window_fail"),
        type: "bar",
        stack: "sliding",
        data: requests.map((req, index) =>
          Math.max(0, req - slidingWindowResults[index])
        ),
        itemStyle: { color: "#f87171" },
      },
      {
        name: t("fixed_window_success"),
        type: "bar",
        stack: "fixed",
        data: fixedWindowResults,
        itemStyle: { color: "#60a5fa" },
      },
      {
        name: t("fixed_window_fail"),
        type: "bar",
        stack: "fixed",
        data: requests.map((req, index) =>
          Math.max(0, req - fixedWindowResults[index])
        ),
        itemStyle: { color: "#fbbf24" },
      },
    ],
  };

  return (
    <div className="w-full m-4 mx-auto p-4 border rounded-lg shadow-lg">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <label className="block mb-2">{t("rate_limit_qps")}</label>
          <input
            type="number"
            value={rateLimit}
            onChange={(e) =>
              setRateLimit(Math.max(1, parseInt(e.target.value) || 0))
            }
            min={1}
            className="w-40 p-2 border rounded"
          />
        </div>
        <button
          onClick={generateRandomRequests}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {t("rate_limit_random")}
        </button>
      </div>
      <div className="grid grid-cols-10 gap-2 mb-4">
        {requests.map((req, index) => (
          <div key={index} className="flex flex-col items-center">
            <span className="mb-1">{index * 200}ms</span>
            <input
              type="number"
              value={req}
              onChange={(e) => {
                const newRequests = [...requests];
                newRequests[index] = Math.max(0, parseInt(e.target.value) || 0);
                setRequests(newRequests);
              }}
              min={0}
              className="w-full p-2 border rounded"
            />
          </div>
        ))}
      </div>
      <br />
      <br />
      <ReactECharts option={option} style={{ height: "400px" }} />
    </div>
  );
};

export default RateLimiter;

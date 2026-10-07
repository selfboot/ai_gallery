import * as echarts from "echarts";
import "echarts/theme/v5";

// The UMD theme imports the ESM entry; Jest needs the same CommonJS instance as this test.
jest.mock("echarts/lib/echarts", () => jest.requireActual("echarts"));

describe("ECharts security upgrade", () => {
  test.each(["bar", "line"])("renders and updates %s charts with the existing theme", (type) => {
    const chart = echarts.init(null, "v5", { renderer: "svg", ssr: true, width: 600, height: 300 });
    try {
      chart.setOption({
        animation: false,
        xAxis: { type: "category", data: ["January", "February"] },
        yAxis: { type: "value" },
        series: [{ type, data: [10, 20] }],
      });
      const initial = chart.renderToSVGString();
      expect(initial).toContain("January");
      expect(initial).toContain("#5470c6");
      chart.setOption({ series: [{ data: [30, 40] }] });
      expect(chart.renderToSVGString()).not.toEqual(initial);
    } finally {
      chart.dispose();
    }
  });

  test("renders an untrusted Lines tooltip name as text rather than HTML", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const chart = echarts.init(host, "v5", { renderer: "svg", width: 600, height: 300 });
    const name = '<img src="invalid" onerror="alert(1)">';
    try {
      chart.setOption({
        animation: false,
        tooltip: { trigger: "item", renderMode: "html" },
        xAxis: { min: 0, max: 2 },
        yAxis: { min: 0, max: 2 },
        series: [{ type: "lines", coordinateSystem: "cartesian2d", data: [{ name, coords: [[0, 0], [1, 1]] }] }],
      });
      chart.dispatchAction({ type: "showTip", seriesIndex: 0, dataIndex: 0 });
      expect(host.textContent).toContain(name);
      expect(host.querySelector("img")).toBeNull();
    } finally {
      chart.dispose();
      host.remove();
    }
  });
});

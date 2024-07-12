import { onCLS, onINP, onFCP, onLCP, onTTFB } from "web-vitals";

const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && typeof onPerfEntry === "function") {
    onCLS((metric) => onPerfEntry(metric));
    onINP((metric) => onPerfEntry(metric));
    onFCP((metric) => onPerfEntry(metric));
    onLCP((metric) => onPerfEntry(metric));
    onTTFB((metric) => onPerfEntry(metric));
  }
};

const sendToAnalytics = ({ name, value }) => {
  if (window.gtag) {
    window.gtag("event", name, {
      event_category: "Web Vitals",
      event_label: name,
      value: Math.round(name === "CLS" ? value * 1000 : value), // CLS 的单位是毫秒
      non_interaction: true, // 标记为非交互事件
    });
  }
};

export default () => reportWebVitals(sendToAnalytics);

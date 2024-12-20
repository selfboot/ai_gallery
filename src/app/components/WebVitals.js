'use client';

import { useEffect } from 'react';
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
  if (typeof window !== 'undefined' && window.gtag) {
    // console.log(`Sending Web Vital: ${name} = ${value}`);
    window.gtag("event", name, {
      event_category: "Web Vitals",
      event_label: name,
      value: Math.round(name === "CLS" ? value * 1000 : value),
      non_interaction: true,
    });
  } else {
    console.log('Google Analytics not available');
  }
};

export function WebVitals() {
  useEffect(() => {
    console.log('WebVitals component mounted');
    reportWebVitals(sendToAnalytics);
  }, []);

  return null;
}
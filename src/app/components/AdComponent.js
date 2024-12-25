"use client";

import { useEffect, useRef } from "react";

// Common ad init logic
function useAdInit() {
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current) {
      return;
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      isLoaded.current = true;
    } catch (err) {
      console.error("Ad error:", err);
    }
  }, []);
}

// https://support.google.com/adsense/answer/9183460?hl=zh-Hans&sjid=15277587185637410503-AP
// format:  “rectangle”、“vertical”、“horizontal”
function BaseAdComponent({ slot, className, format = "rectangle" }) {
  useAdInit();

  return (
    <div className={`relative ${className || ""}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-7746897490519544"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="false"
      />
    </div>
  );
}

export function SideAdComponent({ className, format }) {
  return <BaseAdComponent slot="7437487022" format={format} className={`overflow-hidden ${className || ""}`} />;
}

export function AdComponent({ format }) {
  return <BaseAdComponent slot="4833706118" format={format} />;
}

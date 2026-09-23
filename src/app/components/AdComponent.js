"use client";

import { useEffect, useRef, useState } from "react";

const AD_DIMENSIONS = {
  rectangle: "min-h-[250px]",
  vertical: "min-h-[600px]",
  horizontal: "min-h-[90px]",
  square: "min-h-[250px]",
};

const getReservedHeightClass = (format) => AD_DIMENSIONS[format] || AD_DIMENSIONS.rectangle;

// Hidden desktop slots should not queue ad requests when the mobile script loads.
function useAdInit() {
  const isLoaded = useRef(false);
  const adRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const ad = adRef.current;
    if (!ad) return;

    if (ad.getBoundingClientRect().width > 0) return;

    setIsVisible(false);
    let observer;
    const updateVisibility = () => {
      if (ad.getBoundingClientRect().width === 0) return;
      setIsVisible(true);
      observer?.disconnect();
      window.removeEventListener("resize", updateVisibility);
    };
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateVisibility);
      observer.observe(ad);
    }
    window.addEventListener("resize", updateVisibility);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!isVisible || isLoaded.current || adRef.current?.getBoundingClientRect().width === 0) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      isLoaded.current = true;
    } catch (err) {
      console.error("Ad error:", err);
    }
  }, [isVisible]);

  return { adRef, shouldRender: isVisible || isLoaded.current };
}

// https://support.google.com/adsense/answer/9183460?hl=zh-Hans&sjid=15277587185637410503-AP
// format:  “rectangle”、“vertical”、“horizontal”
function BaseAdComponent({ slot, className, format = "rectangle" }) {
  const { adRef, shouldRender } = useAdInit();
  const reservedHeightClass = getReservedHeightClass(format);

  return (
    <div ref={adRef} className={`relative w-full overflow-hidden bg-gray-50 ${reservedHeightClass} ${className || ""}`}>
      {shouldRender && (
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight: "100%", height: "100%" }}
          data-ad-client="ca-pub-7746897490519544"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="false"
        />
      )}
    </div>
  );
}

export function SideAdComponent({ className, format }) {
  return <BaseAdComponent slot="7437487022" format={format} className={`overflow-hidden ${className || ""}`} />;
}

export function AdComponent({ format }) {
  return <BaseAdComponent slot="4833706118" format={format} />;
}

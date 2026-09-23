"use client";

import { useEffect, useRef, useState } from "react";

const AD_SCRIPT_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7746897490519544";
let adScriptPromise;

function loadAdScript() {
  if (!adScriptPromise) {
    adScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${AD_SCRIPT_SRC}"]`);
      if (existing) {
        // The desktop loader may still be pending; AdSense accepts queued pushes.
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.addEventListener("load", () => {
        resolve();
      }, { once: true });
      script.addEventListener("error", () => {
        script.remove();
        adScriptPromise = undefined;
        reject(new Error("Failed to load AdSense"));
      }, { once: true });

      script.src = AD_SCRIPT_SRC;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    });
  }

  return adScriptPromise;
}

export default function MobileAdComponent({ className = "", slot = "4833706118" }) {
  const adRef = useRef(null);
  const isLoaded = useRef(false);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    const ad = adRef.current;
    if (!ad) return;

    const reveal = () => {
      if (ad.getBoundingClientRect().width > 0) setIsNearViewport(true);
    };

    if (typeof IntersectionObserver === "undefined") {
      reveal();
      window.addEventListener("resize", reveal);
      return () => window.removeEventListener("resize", reveal);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && ad.getBoundingClientRect().width > 0) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(ad);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isNearViewport || isUnavailable || isLoaded.current) return;

    const ad = adRef.current;
    let cancelled = false;
    const initialize = () => {
      if (isLoaded.current || ad.getBoundingClientRect().width === 0) return;

      loadAdScript()
        .then(() => {
          if (cancelled || isLoaded.current || ad.getBoundingClientRect().width === 0) return;

          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            isLoaded.current = true;
            window.removeEventListener("resize", initialize);
          } catch (err) {
            console.error("Ad error:", err);
            setIsUnavailable(true);
          }
        })
        .catch((err) => {
          console.error("Ad error:", err);
          setIsUnavailable(true);
        });
    };

    initialize();
    window.addEventListener("resize", initialize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", initialize);
    };
  }, [isNearViewport, isUnavailable]);

  useEffect(() => {
    if (!isNearViewport || isUnavailable) return;

    const ins = adRef.current?.querySelector("ins");
    if (!ins || typeof MutationObserver === "undefined") return;

    const observer = new MutationObserver(() => {
      if (ins.dataset.adStatus === "unfilled") setIsUnavailable(true);
    });
    observer.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => observer.disconnect();
  }, [isNearViewport, isUnavailable]);

  if (isUnavailable) return null;

  return (
    <div ref={adRef} data-mobile-ad className={`relative w-full min-h-[250px] bg-gray-50 ${className}`}>
      {isNearViewport && (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-7746897490519544"
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="false"
        />
      )}
    </div>
  );
}

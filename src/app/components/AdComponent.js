'use client';

import { useEffect, useRef } from 'react';

// 共用的广告初始化逻辑
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
      console.error('Ad error:', err);
    }
  }, []);
}

// https://support.google.com/adsense/answer/9183460?hl=zh-Hans&sjid=15277587185637410503-AP
// 基础广告组件
function BaseAdComponent({ slot, className }) {
  useAdInit();

  return (
    <div className={`relative ${className || ''}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-7746897490519544"
        data-ad-slot={slot}
        data-ad-format="rectangle"
        data-full-width-responsive="false"
      />
    </div>
  );
}

export function AdComponent() {
  return <BaseAdComponent slot="4833706118" />;
}

export function SideAdComponent({ className }) {
  return <BaseAdComponent 
    slot="7437487022" 
    className={`overflow-hidden ${className || ''}`}
  />;
}

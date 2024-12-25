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

// 基础广告组件
function BaseAdComponent({ slot, className }) {
  useAdInit();

  return (
    <div className={`relative ${className || ''}`}>
      <ins
        className="adsbygoogle absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-7746897490519544"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
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

'use client';

import { useEffect, useRef } from 'react';

export function AdComponent() {
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

  return (
    <div className="my-4">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-7746897490519544"
        data-ad-slot="4833706118"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

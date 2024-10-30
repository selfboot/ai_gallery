'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ShareButtons() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.a2a) {
      window.a2a.init_all();
    } else {
      const script = document.createElement('script');
      script.src = 'https://static.addtoany.com/menu/page.js';
      script.async = true;
      script.onload = () => {
        window.a2a.init_all();
      };
      document.body.appendChild(script);
    }

    return () => {};
  }, [pathname]);

  return (
    <div className="a2a_kit a2a_kit_size_24 a2a_default_style flex items-center gap-1">
      <a className="a2a_dd" href="https://www.addtoany.com/share"></a>
      <a className="a2a_button_twitter"></a>
      <a className="a2a_button_wechat"></a>
      <a className="a2a_button_sina_weibo"></a>
      <a className="a2a_button_facebook"></a>
    </div>
  );
}

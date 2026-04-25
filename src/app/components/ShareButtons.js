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
    <div className="a2a_kit a2a_kit_size_24 a2a_default_style flex min-h-6 min-w-[136px] items-center gap-1">
      <a className="a2a_dd inline-flex h-6 w-6 shrink-0" href="https://www.addtoany.com/share"></a>
      <a className="a2a_button_twitter inline-flex h-6 w-6 shrink-0"></a>
      <a className="a2a_button_wechat inline-flex h-6 w-6 shrink-0"></a>
      <a className="a2a_button_sina_weibo inline-flex h-6 w-6 shrink-0"></a>
      <a className="a2a_button_facebook inline-flex h-6 w-6 shrink-0"></a>
    </div>
  );
}

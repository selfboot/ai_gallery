import React, { useMemo } from 'react';

const getImageUrl = (url, size) => {
  const baseUrl = url.split('/webp')[0]; // 移除任何现有的 /webp 后缀
  return `${baseUrl}/webp${size}`;
};

const ResponsiveWebPImage = React.memo(({ src, alt, isGif = false }) => {
  const imageUrls = useMemo(() => {
    if (isGif) return { src };
    return {
      src: getImageUrl(src, 1600),
      srcSet: `
        ${getImageUrl(src, 400)} 400w,
        ${getImageUrl(src, 800)} 800w,
        ${getImageUrl(src, 1600)} 1600w
      `
    };
  }, [src, isGif]);

  return (
    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
      <img
        {...imageUrls}
        alt={alt}
        loading="lazy"
        style={{
          position: 'absolute',
          height: '100%',
          width: '100%',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          objectFit: "cover",
        }}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
});

ResponsiveWebPImage.displayName = 'ResponsiveWebPImage';

export default ResponsiveWebPImage;
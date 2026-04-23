import React, { useMemo } from "react";

const getImageUrl = (url, size) => {
  const baseUrl = url.split("/webp")[0];
  return `${baseUrl}/webp${size}`;
};

const isLocalAsset = (url) => url.startsWith('/');
const isSvgSource = (url) => url.toLowerCase().includes(".svg");
const DEFAULT_WIDTH = 1600;
const DEFAULT_ASPECT_RATIO = 16 / 9;

const ResponsiveWebPImage = React.memo(({
  src,
  alt,
  isGif = false,
  priority = false,
  aspectRatio = DEFAULT_ASPECT_RATIO,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
}) => {
  const imageUrls = useMemo(() => {
    if (isGif || isLocalAsset(src) || isSvgSource(src)) {
      return { src };
    }

    return {
      src: getImageUrl(src, 1600),
      srcSet: `
        ${getImageUrl(src, 400)} 400w,
        ${getImageUrl(src, 800)} 800w,
        ${getImageUrl(src, 1600)} 1600w
      `,
    };
  }, [src, isGif]);

  const normalizedAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0
    ? aspectRatio
    : DEFAULT_ASPECT_RATIO;
  const height = Math.round(DEFAULT_WIDTH / normalizedAspectRatio);

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: normalizedAspectRatio }}>
      <img
        {...imageUrls}
        alt={alt}
        width={DEFAULT_WIDTH}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        style={{
          position: "absolute",
          height: "100%",
          width: "100%",
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          objectFit: "cover",
        }}
        sizes={sizes}
      />
    </div>
  );
});

ResponsiveWebPImage.displayName = "ResponsiveWebPImage";

export default ResponsiveWebPImage;

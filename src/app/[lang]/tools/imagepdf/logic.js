export const PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  a3: { width: 841.89, height: 1190.55 },
  a5: { width: 419.53, height: 595.28 },
};

export function getPageSize(pageSize, orientation, imageWidth, imageHeight) {
  if (pageSize === "image") {
    return {
      width: imageWidth * 0.75,
      height: imageHeight * 0.75,
    };
  }

  const baseSize = PAGE_SIZES[pageSize] || PAGE_SIZES.a4;
  const portrait = {
    width: Math.min(baseSize.width, baseSize.height),
    height: Math.max(baseSize.width, baseSize.height),
  };
  const landscape = {
    width: portrait.height,
    height: portrait.width,
  };

  if (orientation === "landscape") {
    return landscape;
  }
  if (orientation === "auto" && imageWidth > imageHeight) {
    return landscape;
  }
  return portrait;
}

export function getImagePlacement({ pageWidth, pageHeight, imageWidth, imageHeight, margin, fitMode, reserveFooter }) {
  const footer = reserveFooter ? 24 : 0;
  const contentWidth = Math.max(pageWidth - margin * 2, 1);
  const contentHeight = Math.max(pageHeight - margin * 2 - footer, 1);
  const imageRatio = imageWidth / imageHeight;
  const contentRatio = contentWidth / contentHeight;

  let drawWidth = contentWidth;
  let drawHeight = contentHeight;

  if (fitMode === "cover") {
    if (imageRatio > contentRatio) {
      drawHeight = contentHeight;
      drawWidth = drawHeight * imageRatio;
    } else {
      drawWidth = contentWidth;
      drawHeight = drawWidth / imageRatio;
    }
  } else {
    if (imageRatio > contentRatio) {
      drawWidth = contentWidth;
      drawHeight = drawWidth / imageRatio;
    } else {
      drawHeight = contentHeight;
      drawWidth = drawHeight * imageRatio;
    }

    if (fitMode === "noUpscale") {
      drawWidth = Math.min(drawWidth, imageWidth * 0.75);
      drawHeight = drawWidth / imageRatio;
      if (drawHeight > imageHeight * 0.75) {
        drawHeight = imageHeight * 0.75;
        drawWidth = drawHeight * imageRatio;
      }
    }
  }

  return {
    x: (pageWidth - drawWidth) / 2,
    y: margin + footer + (contentHeight - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  };
}

export function shouldResizeImage(width, height, maxSide) {
  return Number(maxSide) > 0 && Math.max(width, height) > Number(maxSide);
}

export function getResizeDimensions(width, height, maxSide) {
  const limit = Number(maxSide);
  if (!shouldResizeImage(width, height, limit)) {
    return { width, height };
  }

  const scale = limit / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

export function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

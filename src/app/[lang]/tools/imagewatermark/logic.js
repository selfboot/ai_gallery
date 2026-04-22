export const WATERMARK_TYPES = ["text", "image"];
export const WATERMARK_LAYOUT_MODES = ["single", "tile"];
export const WATERMARK_POSITIONS = [
  "topLeft",
  "topCenter",
  "topRight",
  "centerLeft",
  "center",
  "centerRight",
  "bottomLeft",
  "bottomCenter",
  "bottomRight",
];

export const OUTPUT_FORMATS = {
  original: { labelKey: "imagewatermark_format_original" },
  jpeg: { labelKey: "imagewatermark_format_jpeg" },
  png: { labelKey: "imagewatermark_format_png" },
  webp: { labelKey: "imagewatermark_format_webp" },
};

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function getMimeFromOutputFormat(format, originalType = "image/png") {
  if (format === "jpeg") {
    return "image/jpeg";
  }
  if (format === "png") {
    return "image/png";
  }
  if (format === "webp") {
    return "image/webp";
  }
  if (["image/jpeg", "image/png", "image/webp"].includes(originalType)) {
    return originalType;
  }
  return "image/png";
}

export function getExtensionFromMime(mimeType) {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "png";
}

export function makeOutputFileName(fileName, mimeType) {
  const baseName = String(fileName || "image").replace(/\.[^.]+$/, "") || "image";
  return `${baseName}_watermarked.${getExtensionFromMime(mimeType)}`;
}

export function makeZipName() {
  return `watermarked_images_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.zip`;
}

export function summarizeResults(items) {
  return {
    count: items.length,
    originalSize: items.reduce((sum, item) => sum + item.originalSize, 0),
    outputSize: items.reduce((sum, item) => sum + item.outputSize, 0),
  };
}

export function getPositionedRect({ pageWidth, pageHeight, itemWidth, itemHeight, position, margin = 24 }) {
  const horizontalMap = {
    topLeft: margin,
    centerLeft: margin,
    bottomLeft: margin,
    topCenter: (pageWidth - itemWidth) / 2,
    center: (pageWidth - itemWidth) / 2,
    bottomCenter: (pageWidth - itemWidth) / 2,
    topRight: pageWidth - itemWidth - margin,
    centerRight: pageWidth - itemWidth - margin,
    bottomRight: pageWidth - itemWidth - margin,
  };

  const verticalMap = {
    topLeft: margin,
    topCenter: margin,
    topRight: margin,
    centerLeft: (pageHeight - itemHeight) / 2,
    center: (pageHeight - itemHeight) / 2,
    centerRight: (pageHeight - itemHeight) / 2,
    bottomLeft: pageHeight - itemHeight - margin,
    bottomCenter: pageHeight - itemHeight - margin,
    bottomRight: pageHeight - itemHeight - margin,
  };

  return {
    x: Math.max(0, horizontalMap[position] ?? horizontalMap.center),
    y: Math.max(0, verticalMap[position] ?? verticalMap.center),
    width: itemWidth,
    height: itemHeight,
  };
}

export function getRotatedBoundingSize(width, height, rotationDegrees) {
  const radians = (Math.abs(rotationDegrees) * Math.PI) / 180;
  const sinValue = Math.abs(Math.sin(radians));
  const cosValue = Math.abs(Math.cos(radians));
  return {
    width: width * cosValue + height * sinValue,
    height: width * sinValue + height * cosValue,
  };
}

export function getSafePositionedRect({ pageWidth, pageHeight, itemWidth, itemHeight, rotationDegrees = 0, position, margin = 24 }) {
  const rotated = getRotatedBoundingSize(itemWidth, itemHeight, rotationDegrees);
  const safeRect = getPositionedRect({
    pageWidth,
    pageHeight,
    itemWidth: Math.min(rotated.width, Math.max(pageWidth - margin * 2, 0)),
    itemHeight: Math.min(rotated.height, Math.max(pageHeight - margin * 2, 0)),
    position,
    margin,
  });

  return {
    x: safeRect.x + Math.max(0, (safeRect.width - itemWidth) / 2),
    y: safeRect.y + Math.max(0, (safeRect.height - itemHeight) / 2),
    width: itemWidth,
    height: itemHeight,
  };
}

export function getTextWatermarkRect({ imageWidth, imageHeight, textWidth, textHeight, position, rotationDegrees = 0 }) {
  return getSafePositionedRect({
    pageWidth: imageWidth,
    pageHeight: imageHeight,
    itemWidth: textWidth,
    itemHeight: textHeight,
    position,
    rotationDegrees,
    margin: Math.max(16, Math.min(imageWidth, imageHeight) * 0.04),
  });
}

export function getTextTileRects({ imageWidth, imageHeight, textWidth, textHeight, rotationDegrees = 0 }) {
  const rotated = getRotatedBoundingSize(textWidth, textHeight, rotationDegrees);
  const stepX = Math.max(rotated.width * 1.25, 72);
  const stepY = Math.max(rotated.height * 1.35, 60);
  const rects = [];

  for (let y = -rotated.height * 0.5; y < imageHeight + rotated.height; y += stepY) {
    const rowOffset = Math.round(y / stepY) % 2 === 0 ? 0 : stepX / 2;
    for (let x = -rotated.width * 0.5 + rowOffset; x < imageWidth + rotated.width; x += stepX) {
      rects.push({
        x: x + (rotated.width - textWidth) / 2,
        y: y + (rotated.height - textHeight) / 2,
        width: textWidth,
        height: textHeight,
      });
    }
  }

  return rects;
}

export function getImageWatermarkRect({ imageWidth, imageHeight, watermarkWidth, watermarkHeight, widthRatio, position, rotationDegrees = 0 }) {
  const targetWidth = Math.max(36, Math.min(imageWidth - 48, imageWidth * widthRatio));
  const aspectRatio = watermarkWidth > 0 && watermarkHeight > 0 ? watermarkWidth / watermarkHeight : 1;
  let targetHeight = targetWidth / aspectRatio;
  const maxHeight = Math.max(36, imageHeight * 0.45);

  if (targetHeight > maxHeight) {
    targetHeight = maxHeight;
  }

  const adjustedWidth = targetHeight * aspectRatio;

  return getSafePositionedRect({
    pageWidth: imageWidth,
    pageHeight: imageHeight,
    itemWidth: adjustedWidth,
    itemHeight: targetHeight,
    position,
    rotationDegrees,
    margin: Math.max(16, Math.min(imageWidth, imageHeight) * 0.04),
  });
}

export function getImageTileRects({ imageWidth, imageHeight, watermarkWidth, watermarkHeight, widthRatio, rotationDegrees = 0 }) {
  const targetWidth = Math.max(36, Math.min(imageWidth - 48, imageWidth * widthRatio));
  const aspectRatio = watermarkWidth > 0 && watermarkHeight > 0 ? watermarkWidth / watermarkHeight : 1;
  let targetHeight = targetWidth / aspectRatio;
  const maxHeight = Math.max(36, imageHeight * 0.28);

  if (targetHeight > maxHeight) {
    targetHeight = maxHeight;
  }

  const adjustedWidth = targetHeight * aspectRatio;
  const rotated = getRotatedBoundingSize(adjustedWidth, targetHeight, rotationDegrees);
  const stepX = Math.max(rotated.width * 1.35, 88);
  const stepY = Math.max(rotated.height * 1.45, 72);
  const rects = [];

  for (let y = -rotated.height * 0.5; y < imageHeight + rotated.height; y += stepY) {
    const rowOffset = Math.round(y / stepY) % 2 === 0 ? 0 : stepX / 2;
    for (let x = -rotated.width * 0.5 + rowOffset; x < imageWidth + rotated.width; x += stepX) {
      rects.push({
        x: x + (rotated.width - adjustedWidth) / 2,
        y: y + (rotated.height - targetHeight) / 2,
        width: adjustedWidth,
        height: targetHeight,
      });
    }
  }

  return rects;
}

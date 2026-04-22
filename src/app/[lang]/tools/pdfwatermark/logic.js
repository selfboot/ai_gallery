export const WATERMARK_TYPES = ["text", "image"];
export const PAGE_SELECTION_MODES = ["all", "custom"];
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

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function makeOutputFileName(fileName) {
  const baseName = fileName?.replace(/\.pdf$/i, "") || "watermark";
  return `${baseName}-watermarked.pdf`;
}

export function hexToRgb(hexColor) {
  const hex = `${hexColor || ""}`.replace("#", "").trim();
  const normalized = hex.length === 3 ? hex.split("").map((char) => `${char}${char}`).join("") : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return { r: 0.55, g: 0.55, b: 0.55 };
  }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16) / 255,
    g: Number.parseInt(normalized.slice(2, 4), 16) / 255,
    b: Number.parseInt(normalized.slice(4, 6), 16) / 255,
  };
}

export function parsePageSelection(mode, rangeText, pageCount) {
  if (mode !== "custom") {
    return new Set(Array.from({ length: pageCount }, (_, index) => index));
  }

  const text = `${rangeText || ""}`.trim();
  if (!text) {
    throw new Error("missing page range");
  }

  const pages = new Set();
  const segments = text.split(",").map((item) => item.trim()).filter(Boolean);
  if (segments.length === 0) {
    throw new Error("missing page range");
  }

  segments.forEach((segment) => {
    const rangeMatch = segment.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1], 10);
      const end = Number.parseInt(rangeMatch[2], 10);
      if (start < 1 || end < 1 || start > end || end > pageCount) {
        throw new Error("invalid page range");
      }
      for (let page = start; page <= end; page += 1) {
        pages.add(page - 1);
      }
      return;
    }

    const page = Number.parseInt(segment, 10);
    if (!Number.isInteger(page) || page < 1 || page > pageCount) {
      throw new Error("invalid page range");
    }
    pages.add(page - 1);
  });

  if (pages.size === 0) {
    throw new Error("missing page range");
  }

  return pages;
}

export function getPositionedRect({ pageWidth, pageHeight, itemWidth, itemHeight, position, margin = 36 }) {
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
    topLeft: pageHeight - itemHeight - margin,
    topCenter: pageHeight - itemHeight - margin,
    topRight: pageHeight - itemHeight - margin,
    centerLeft: (pageHeight - itemHeight) / 2,
    center: (pageHeight - itemHeight) / 2,
    centerRight: (pageHeight - itemHeight) / 2,
    bottomLeft: margin,
    bottomCenter: margin,
    bottomRight: margin,
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

export function getSafePositionedRect({ pageWidth, pageHeight, itemWidth, itemHeight, rotationDegrees = 0, position, margin = 36 }) {
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

export function getTextWatermarkRect({ pageWidth, pageHeight, textWidth, textHeight, position, rotationDegrees = 0 }) {
  return getSafePositionedRect({
    pageWidth,
    pageHeight,
    itemWidth: textWidth,
    itemHeight: textHeight,
    position,
    rotationDegrees,
    margin: 36,
  });
}

export function getTextTileRects({ pageWidth, pageHeight, textWidth, textHeight, rotationDegrees = 0 }) {
  const rotated = getRotatedBoundingSize(textWidth, textHeight, rotationDegrees);
  const stepX = Math.max(rotated.width * 1.25, 96);
  const stepY = Math.max(rotated.height * 1.35, 72);
  const rects = [];

  for (let y = -rotated.height * 0.5; y < pageHeight + rotated.height; y += stepY) {
    const rowOffset = Math.round(y / stepY) % 2 === 0 ? 0 : stepX / 2;
    for (let x = -rotated.width * 0.5 + rowOffset; x < pageWidth + rotated.width; x += stepX) {
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

export function getImageWatermarkRect({ pageWidth, pageHeight, imageWidth, imageHeight, widthRatio, position, rotationDegrees = 0 }) {
  const targetWidth = Math.max(48, Math.min(pageWidth - 72, pageWidth * widthRatio));
  const aspectRatio = imageWidth > 0 && imageHeight > 0 ? imageWidth / imageHeight : 1;
  let targetHeight = targetWidth / aspectRatio;
  const maxHeight = Math.max(48, pageHeight * 0.45);

  if (targetHeight > maxHeight) {
    targetHeight = maxHeight;
  }

  const adjustedWidth = targetHeight * aspectRatio;

  return getSafePositionedRect({
    pageWidth,
    pageHeight,
    itemWidth: adjustedWidth,
    itemHeight: targetHeight,
    position,
    rotationDegrees,
    margin: 36,
  });
}

export function getImageTileRects({ pageWidth, pageHeight, imageWidth, imageHeight, widthRatio, rotationDegrees = 0 }) {
  const targetWidth = Math.max(48, Math.min(pageWidth - 72, pageWidth * widthRatio));
  const aspectRatio = imageWidth > 0 && imageHeight > 0 ? imageWidth / imageHeight : 1;
  let targetHeight = targetWidth / aspectRatio;
  const maxHeight = Math.max(48, pageHeight * 0.28);

  if (targetHeight > maxHeight) {
    targetHeight = maxHeight;
  }

  const adjustedWidth = targetHeight * aspectRatio;
  const rotated = getRotatedBoundingSize(adjustedWidth, targetHeight, rotationDegrees);
  const stepX = Math.max(rotated.width * 1.22, 90);
  const stepY = Math.max(rotated.height * 1.28, 72);
  const rects = [];

  for (let y = -rotated.height * 0.45; y < pageHeight + rotated.height; y += stepY) {
    const rowOffset = Math.round(y / stepY) % 2 === 0 ? 0 : stepX / 2;
    for (let x = -rotated.width * 0.45 + rowOffset; x < pageWidth + rotated.width; x += stepX) {
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

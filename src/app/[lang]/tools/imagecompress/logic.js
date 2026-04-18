export const IMAGE_COMPRESS_PRESETS = {
  quick: { outputFormat: "auto", quality: 0.82, maxSide: 2560 },
  quality: { outputFormat: "auto", quality: 0.9, maxSide: 3200 },
  smallest: { outputFormat: "webp", quality: 0.68, maxSide: 1920 },
};

export function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
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
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function getExtensionFromMime(mimeType) {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "jpg";
}

export function getMimeFromOutputFormat(format, originalType = "image/jpeg") {
  if (format === "jpeg") {
    return "image/jpeg";
  }
  if (format === "png") {
    return "image/png";
  }
  if (format === "webp" || format === "auto") {
    return "image/webp";
  }
  if (format === "original" && ["image/jpeg", "image/png", "image/webp"].includes(originalType)) {
    return originalType;
  }
  return "image/webp";
}

export function makeCompressedFileName(fileName, mimeType) {
  const baseName = String(fileName || "image").replace(/\.[^.]+$/, "") || "image";
  return `${baseName}_compressed.${getExtensionFromMime(mimeType)}`;
}

export function calculateSaving(originalSize, outputSize) {
  if (!originalSize || originalSize <= 0) {
    return 0;
  }
  return Math.round(((originalSize - outputSize) / originalSize) * 100);
}

export function summarizeCompression(items) {
  const originalSize = items.reduce((sum, item) => sum + (item.originalSize || 0), 0);
  const outputSize = items.reduce((sum, item) => sum + (item.outputSize || 0), 0);

  return {
    count: items.length,
    originalSize,
    outputSize,
    savingPercent: calculateSaving(originalSize, outputSize),
  };
}

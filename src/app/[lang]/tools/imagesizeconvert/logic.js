export const OUTPUT_FORMATS = {
  auto: { labelKey: "imagesizeconvert_format_auto" },
  original: { labelKey: "imagesizeconvert_format_original" },
  jpeg: { labelKey: "imagesizeconvert_format_jpeg" },
  webp: { labelKey: "imagesizeconvert_format_webp" },
  png: { labelKey: "imagesizeconvert_format_png" },
};

export const TARGET_SIZE_UNITS = ["KB", "MB"];

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

export function bytesFromTarget(value, unit) {
  const safeValue = Number.parseFloat(value);
  const normalized = Number.isFinite(safeValue) ? Math.max(safeValue, 1) : 1;
  return unit === "MB" ? Math.round(normalized * 1024 * 1024) : Math.round(normalized * 1024);
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
  if (["image/jpeg", "image/png", "image/webp"].includes(originalType)) {
    return originalType;
  }
  return "image/webp";
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

export function makeOutputFileName(fileName, mimeType) {
  const baseName = String(fileName || "image").replace(/\.[^.]+$/, "") || "image";
  return `${baseName}_target-size.${getExtensionFromMime(mimeType)}`;
}

export function makeZipName() {
  return `target_size_images_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.zip`;
}

export function calculateSaving(originalSize, outputSize) {
  if (!originalSize || originalSize <= 0) {
    return 0;
  }
  return Math.round(((originalSize - outputSize) / originalSize) * 100);
}

export function summarizeResults(items) {
  return {
    count: items.length,
    originalSize: items.reduce((sum, item) => sum + (item.originalSize || 0), 0),
    outputSize: items.reduce((sum, item) => sum + (item.outputSize || 0), 0),
  };
}

export function getScaledDimensions(width, height, scale) {
  const safeScale = Math.max(0.05, Math.min(scale, 1));
  return {
    width: Math.max(1, Math.round(width * safeScale)),
    height: Math.max(1, Math.round(height * safeScale)),
  };
}

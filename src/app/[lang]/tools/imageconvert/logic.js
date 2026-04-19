export const IMAGE_CONVERT_FORMATS = ["jpeg", "png", "webp", "avif"];

export function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function getMimeFromFormat(format) {
  if (format === "png") {
    return "image/png";
  }
  if (format === "webp") {
    return "image/webp";
  }
  if (format === "avif") {
    return "image/avif";
  }
  return "image/jpeg";
}

export function getExtensionFromFormat(format) {
  if (format === "jpeg") {
    return "jpg";
  }
  return IMAGE_CONVERT_FORMATS.includes(format) ? format : "jpg";
}

export function getFormatFromMime(mimeType) {
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  if (mimeType === "image/avif") {
    return "avif";
  }
  return "jpeg";
}

export function makeConvertedFileName(fileName, format) {
  const baseName = String(fileName || "image").replace(/\.[^.]+$/, "") || "image";
  return `${baseName}.${getExtensionFromFormat(format)}`;
}

export function makeUniqueFileName(fileName, usedNames) {
  if (!usedNames.has(fileName)) {
    usedNames.add(fileName);
    return fileName;
  }

  const match = String(fileName).match(/^(.*?)(\.[^.]+)?$/);
  const baseName = match?.[1] || "image";
  const extension = match?.[2] || "";
  let index = 2;
  let nextName = `${baseName}_${index}${extension}`;
  while (usedNames.has(nextName)) {
    index += 1;
    nextName = `${baseName}_${index}${extension}`;
  }
  usedNames.add(nextName);
  return nextName;
}

export function calculateChangePercent(originalSize, outputSize) {
  if (!originalSize || originalSize <= 0) {
    return 0;
  }
  return Math.round(((outputSize - originalSize) / originalSize) * 100);
}

export function summarizeConvertedImages(items) {
  const originalSize = items.reduce((sum, item) => sum + (item.originalSize || 0), 0);
  const outputSize = items.reduce((sum, item) => sum + (item.outputSize || 0), 0);

  return {
    count: items.length,
    originalSize,
    outputSize,
    changePercent: calculateChangePercent(originalSize, outputSize),
  };
}

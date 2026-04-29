export const IMAGE_BLUR_ACCEPT = ".jpg,.jpeg,.png,.webp";

export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const REDACTION_MODES = {
  MOSAIC: "mosaic",
  BLUR: "blur",
  BLACK: "black",
  WHITE: "white",
  COLOR: "color",
};

export const OUTPUT_FORMATS = {
  ORIGINAL: "original",
  PNG: "png",
  JPEG: "jpeg",
  WEBP: "webp",
};

export function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function clampRegion(region) {
  const x = clampNumber(region.x, 0, 0, 1);
  const y = clampNumber(region.y, 0, 0, 1);
  const width = clampNumber(region.width, 0.1, 0.002, 1);
  const height = clampNumber(region.height, 0.1, 0.002, 1);
  return {
    ...region,
    x: Math.min(x, 1 - width),
    y: Math.min(y, 1 - height),
    width,
    height,
  };
}

export function makeRegionId() {
  return `region-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function getMimeFromOutputFormat(outputFormat, originalType) {
  if (outputFormat === OUTPUT_FORMATS.PNG) return "image/png";
  if (outputFormat === OUTPUT_FORMATS.JPEG) return "image/jpeg";
  if (outputFormat === OUTPUT_FORMATS.WEBP) return "image/webp";
  return SUPPORTED_IMAGE_TYPES.includes(originalType) ? originalType : "image/png";
}

export function makeOutputFileName(fileName, mimeType) {
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const baseName = String(fileName || "image").replace(/\.[^.]+$/, "") || "image";
  return `${baseName}-redacted.${extension}`;
}

export function regionToPixels(region, imageWidth, imageHeight) {
  const safe = clampRegion(region);
  return {
    x: Math.round(safe.x * imageWidth),
    y: Math.round(safe.y * imageHeight),
    width: Math.max(1, Math.round(safe.width * imageWidth)),
    height: Math.max(1, Math.round(safe.height * imageHeight)),
  };
}

export function getRegionLabel(index) {
  return `#${index + 1}`;
}


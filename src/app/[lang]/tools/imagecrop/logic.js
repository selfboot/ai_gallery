export const CROP_MODES = ["inset", "aspect"];
export const OUTPUT_FORMATS = {
  original: { labelKey: "imagecrop_format_original" },
  jpeg: { labelKey: "imagecrop_format_jpeg" },
  png: { labelKey: "imagecrop_format_png" },
  webp: { labelKey: "imagecrop_format_webp" },
};

export const ASPECT_PRESETS = [
  { value: "1:1", labelKey: "imagecrop_aspect_1_1" },
  { value: "4:3", labelKey: "imagecrop_aspect_4_3" },
  { value: "3:4", labelKey: "imagecrop_aspect_3_4" },
  { value: "16:9", labelKey: "imagecrop_aspect_16_9" },
  { value: "9:16", labelKey: "imagecrop_aspect_9_16" },
  { value: "custom", labelKey: "imagecrop_aspect_custom" },
];

export const CROP_POSITIONS = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
];

export function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
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
  return `${baseName}_cropped.${getExtensionFromMime(mimeType)}`;
}

export function makeZipName() {
  return `cropped_images_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.zip`;
}

function getAnchorRatio(position = "center") {
  const ratioMap = {
    "top-left": { x: 0, y: 0 },
    top: { x: 0.5, y: 0 },
    "top-right": { x: 1, y: 0 },
    left: { x: 0, y: 0.5 },
    center: { x: 0.5, y: 0.5 },
    right: { x: 1, y: 0.5 },
    "bottom-left": { x: 0, y: 1 },
    bottom: { x: 0.5, y: 1 },
    "bottom-right": { x: 1, y: 1 },
  };

  return ratioMap[position] || ratioMap.center;
}

export function getAspectRatio(settings) {
  if (settings.aspectPreset && settings.aspectPreset !== "custom") {
    const [widthPart, heightPart] = settings.aspectPreset.split(":").map((value) => Number(value));
    if (Number.isFinite(widthPart) && Number.isFinite(heightPart) && widthPart > 0 && heightPart > 0) {
      return widthPart / heightPart;
    }
  }

  const customWidth = clampNumber(settings.customAspectWidth, 1, 1, 999);
  const customHeight = clampNumber(settings.customAspectHeight, 1, 1, 999);
  return customWidth / customHeight;
}

export function getCropPlan(image, settings) {
  const originalWidth = Math.max(1, Math.round(image.width));
  const originalHeight = Math.max(1, Math.round(image.height));

  if (settings.cropMode === "inset") {
    const topPercent = clampNumber(settings.insetTop, 0, 0, 45);
    const rightPercent = clampNumber(settings.insetRight, 0, 0, 45);
    const bottomPercent = clampNumber(settings.insetBottom, 0, 0, 45);
    const leftPercent = clampNumber(settings.insetLeft, 0, 0, 45);
    const sourceX = Math.round(originalWidth * (leftPercent / 100));
    const sourceY = Math.round(originalHeight * (topPercent / 100));
    const sourceWidth = Math.max(1, Math.round(originalWidth * (1 - (leftPercent + rightPercent) / 100)));
    const sourceHeight = Math.max(1, Math.round(originalHeight * (1 - (topPercent + bottomPercent) / 100)));

    return {
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      width: sourceWidth,
      height: sourceHeight,
    };
  }

  const targetRatio = getAspectRatio(settings);
  const originalRatio = originalWidth / originalHeight;
  let sourceWidth = originalWidth;
  let sourceHeight = originalHeight;

  if (originalRatio > targetRatio) {
    sourceWidth = Math.max(1, Math.round(originalHeight * targetRatio));
  } else if (originalRatio < targetRatio) {
    sourceHeight = Math.max(1, Math.round(originalWidth / targetRatio));
  }

  const anchor = getAnchorRatio(settings.cropPosition);
  const maxSourceX = Math.max(0, originalWidth - sourceWidth);
  const maxSourceY = Math.max(0, originalHeight - sourceHeight);

  return {
    sourceX: Math.round(maxSourceX * anchor.x),
    sourceY: Math.round(maxSourceY * anchor.y),
    sourceWidth,
    sourceHeight,
    width: sourceWidth,
    height: sourceHeight,
  };
}

export function summarizeResults(items) {
  return {
    count: items.length,
    originalSize: items.reduce((sum, item) => sum + item.originalSize, 0),
    outputSize: items.reduce((sum, item) => sum + item.outputSize, 0),
  };
}

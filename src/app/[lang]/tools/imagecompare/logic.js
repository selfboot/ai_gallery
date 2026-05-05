export const IMAGE_COMPARE_ACCEPT = "image/png,image/jpeg,image/webp,image/bmp";

export const ALIGN_MODES = {
  TOP_LEFT: "top-left",
  CENTER: "center",
  STRETCH: "stretch",
};

export const DEFAULT_SETTINGS = {
  threshold: 0.1,
  ignoreAntiAlias: true,
  alignMode: ALIGN_MODES.CENTER,
  diffColor: "#ff0050",
};

export function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function hexToRgb(hex) {
  const normalized = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return [255, 0, 80];
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

export function getCompareSize(left, right, alignMode) {
  if (!left || !right) return { width: 1, height: 1 };
  if (alignMode === ALIGN_MODES.STRETCH) {
    return { width: left.width, height: left.height };
  }
  return {
    width: Math.max(left.width, right.width),
    height: Math.max(left.height, right.height),
  };
}

export function getDrawRect(image, canvasSize, alignMode) {
  if (alignMode === ALIGN_MODES.STRETCH) {
    return { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height };
  }
  if (alignMode === ALIGN_MODES.TOP_LEFT) {
    return { x: 0, y: 0, width: image.width, height: image.height };
  }
  return {
    x: Math.round((canvasSize.width - image.width) / 2),
    y: Math.round((canvasSize.height - image.height) / 2),
    width: image.width,
    height: image.height,
  };
}

export function makeResultSummary({ diffPixels, width, height }) {
  const totalPixels = Math.max(1, width * height);
  const diffRatio = diffPixels / totalPixels;
  return {
    totalPixels,
    diffPixels,
    diffRatio,
    samePixels: Math.max(0, totalPixels - diffPixels),
  };
}

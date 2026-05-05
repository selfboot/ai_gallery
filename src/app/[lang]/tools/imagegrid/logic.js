export const IMAGE_GRID_ACCEPT = "image/png,image/jpeg,image/webp,image/bmp";

export const FIT_MODES = {
  COVER: "cover",
  CONTAIN: "contain",
};

export const OUTPUT_FORMATS = {
  PNG: "png",
  JPG: "jpg",
};

export const GRID_PRESETS = [
  { id: "xiaohongshu-3x3", cols: 3, rows: 3, tileSize: 1080, labelKey: "imagegrid_preset_xhs_3x3" },
  { id: "instagram-3x3", cols: 3, rows: 3, tileSize: 1080, labelKey: "imagegrid_preset_instagram_3x3" },
  { id: "panorama-3x1", cols: 3, rows: 1, tileSize: 1080, labelKey: "imagegrid_preset_panorama_3x1" },
  { id: "banner-3x2", cols: 3, rows: 2, tileSize: 1080, labelKey: "imagegrid_preset_banner_3x2" },
];

export const DEFAULT_SETTINGS = {
  presetId: "xiaohongshu-3x3",
  fitMode: FIT_MODES.COVER,
  tileSize: 1080,
  focusX: 50,
  focusY: 50,
  backgroundColor: "#ffffff",
  outputFormat: OUTPUT_FORMATS.JPG,
  quality: 0.92,
};

export function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function getPresetById(presetId) {
  return GRID_PRESETS.find((preset) => preset.id === presetId) || GRID_PRESETS[0];
}

export function getGridSize(settings) {
  const preset = getPresetById(settings.presetId);
  const tileSize = Math.round(clampNumber(settings.tileSize, preset.tileSize, 128, 4096));
  return {
    cols: preset.cols,
    rows: preset.rows,
    tileSize,
    width: preset.cols * tileSize,
    height: preset.rows * tileSize,
  };
}

export function getMimeFromOutputFormat(format) {
  return format === OUTPUT_FORMATS.PNG ? "image/png" : "image/jpeg";
}

export function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  return `${(size / 1024).toFixed(1)} KB`;
}

export function sanitizeFileName(fileName) {
  return String(fileName || "image")
    .replace(/\.[^.]+$/, "")
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "image";
}

export function makeTileName(fileName, row, col, cols, format) {
  const index = row * cols + col + 1;
  return `${sanitizeFileName(fileName)}_grid_${String(index).padStart(2, "0")}_r${row + 1}c${col + 1}.${format}`;
}

export function makeZipName(fileName) {
  return `${sanitizeFileName(fileName)}_image_grid_${new Date().toISOString().slice(0, 10)}.zip`;
}

export function getDrawPlan(imageSize, canvasSize, settings) {
  const focusX = clampNumber(settings.focusX, 50, 0, 100) / 100;
  const focusY = clampNumber(settings.focusY, 50, 0, 100) / 100;
  const imageRatio = imageSize.width / imageSize.height;
  const canvasRatio = canvasSize.width / canvasSize.height;

  if (settings.fitMode === FIT_MODES.CONTAIN) {
    const scale = imageRatio > canvasRatio ? canvasSize.width / imageSize.width : canvasSize.height / imageSize.height;
    const destWidth = imageSize.width * scale;
    const destHeight = imageSize.height * scale;
    return {
      sourceX: 0,
      sourceY: 0,
      sourceWidth: imageSize.width,
      sourceHeight: imageSize.height,
      destX: (canvasSize.width - destWidth) / 2,
      destY: (canvasSize.height - destHeight) / 2,
      destWidth,
      destHeight,
    };
  }

  let sourceWidth = imageSize.width;
  let sourceHeight = imageSize.height;
  if (imageRatio > canvasRatio) {
    sourceWidth = imageSize.height * canvasRatio;
  } else {
    sourceHeight = imageSize.width / canvasRatio;
  }

  return {
    sourceX: (imageSize.width - sourceWidth) * focusX,
    sourceY: (imageSize.height - sourceHeight) * focusY,
    sourceWidth,
    sourceHeight,
    destX: 0,
    destY: 0,
    destWidth: canvasSize.width,
    destHeight: canvasSize.height,
  };
}

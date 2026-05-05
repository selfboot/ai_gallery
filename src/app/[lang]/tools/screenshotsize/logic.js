export const SCREENSHOT_SIZE_ACCEPT = ".jpg,.jpeg,.png,.webp";

export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const OUTPUT_FORMATS = {
  PNG: "png",
  JPEG: "jpeg",
  WEBP: "webp",
};

export const FIT_MODES = {
  COVER: "cover",
  CONTAIN: "contain",
};

export const SIZE_PRESETS = [
  { id: "xiaohongshu-3-4", group: "xiaohongshu", width: 1242, height: 1660, labelKey: "screenshotsize_preset_xhs_3_4" },
  { id: "xiaohongshu-4-5", group: "xiaohongshu", width: 1080, height: 1350, labelKey: "screenshotsize_preset_xhs_4_5" },
  { id: "xiaohongshu-1-1", group: "xiaohongshu", width: 1080, height: 1080, labelKey: "screenshotsize_preset_xhs_1_1" },
  { id: "wechat-cover", group: "wechat", width: 900, height: 383, labelKey: "screenshotsize_preset_wechat_cover" },
  { id: "wechat-square", group: "wechat", width: 500, height: 500, labelKey: "screenshotsize_preset_wechat_square" },
  { id: "x-post", group: "twitter", width: 1600, height: 900, labelKey: "screenshotsize_preset_x_post" },
  { id: "x-header", group: "twitter", width: 1500, height: 500, labelKey: "screenshotsize_preset_x_header" },
  { id: "x-profile", group: "twitter", width: 400, height: 400, labelKey: "screenshotsize_preset_x_profile" },
  { id: "youtube-thumb", group: "youtube", width: 1280, height: 720, labelKey: "screenshotsize_preset_youtube_thumb" },
  { id: "youtube-banner", group: "youtube", width: 2560, height: 1440, labelKey: "screenshotsize_preset_youtube_banner" },
  { id: "opengraph", group: "opengraph", width: 1200, height: 630, labelKey: "screenshotsize_preset_opengraph" },
];

export const PRESET_GROUPS = [
  { id: "xiaohongshu", labelKey: "screenshotsize_group_xiaohongshu" },
  { id: "wechat", labelKey: "screenshotsize_group_wechat" },
  { id: "twitter", labelKey: "screenshotsize_group_twitter" },
  { id: "youtube", labelKey: "screenshotsize_group_youtube" },
  { id: "opengraph", labelKey: "screenshotsize_group_opengraph" },
];

export function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function getPresetById(id) {
  return SIZE_PRESETS.find((preset) => preset.id === id) || SIZE_PRESETS[0];
}

export function getMimeFromOutputFormat(format) {
  if (format === OUTPUT_FORMATS.JPEG) return "image/jpeg";
  if (format === OUTPUT_FORMATS.WEBP) return "image/webp";
  return "image/png";
}

export function getExtensionFromMime(mimeType) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

export function makeOutputFileName(fileName, preset, mimeType) {
  const baseName = String(fileName || "screenshot").replace(/\.[^.]+$/, "") || "screenshot";
  return `${baseName}-${preset.id}-${preset.width}x${preset.height}.${getExtensionFromMime(mimeType)}`;
}

export function makeZipName() {
  return `social-image-sizes-${new Date().toISOString().slice(0, 10)}.zip`;
}

export function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function getDrawPlan(image, preset, settings) {
  const imageWidth = Math.max(1, image.width);
  const imageHeight = Math.max(1, image.height);
  const targetWidth = Math.max(1, preset.width);
  const targetHeight = Math.max(1, preset.height);
  const zoom = clampNumber(settings.zoom, 1, 1, 3);
  const focusX = clampNumber(settings.focusX, 50, 0, 100) / 100;
  const focusY = clampNumber(settings.focusY, 50, 0, 100) / 100;

  if (settings.fitMode === FIT_MODES.CONTAIN) {
    const scale = Math.min(targetWidth / imageWidth, targetHeight / imageHeight) * zoom;
    const destWidth = Math.max(1, imageWidth * scale);
    const destHeight = Math.max(1, imageHeight * scale);
    return {
      sourceX: 0,
      sourceY: 0,
      sourceWidth: imageWidth,
      sourceHeight: imageHeight,
      destX: (targetWidth - destWidth) * focusX,
      destY: (targetHeight - destHeight) * focusY,
      destWidth,
      destHeight,
    };
  }

  const scale = Math.max(targetWidth / imageWidth, targetHeight / imageHeight) * zoom;
  const sourceWidth = Math.min(imageWidth, targetWidth / scale);
  const sourceHeight = Math.min(imageHeight, targetHeight / scale);
  const maxSourceX = Math.max(0, imageWidth - sourceWidth);
  const maxSourceY = Math.max(0, imageHeight - sourceHeight);
  return {
    sourceX: maxSourceX * focusX,
    sourceY: maxSourceY * focusY,
    sourceWidth,
    sourceHeight,
    destX: 0,
    destY: 0,
    destWidth: targetWidth,
    destHeight: targetHeight,
  };
}

export function normalizeSelectedPresetIds(ids) {
  const availableIds = new Set(SIZE_PRESETS.map((preset) => preset.id));
  return Array.from(new Set(ids)).filter((id) => availableIds.has(id));
}


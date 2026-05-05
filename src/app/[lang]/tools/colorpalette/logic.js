export const COLOR_PALETTE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.gif,.bmp";

export const DEFAULT_SETTINGS = {
  colorCount: 8,
  sampleStep: 6,
  ignoreTransparent: true,
};

export function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function rgbToHex(color) {
  return `#${[color.r, color.g, color.b].map((value) => clampNumber(Math.round(value), 0, 0, 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function rgbToHsl(color) {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) h = (g - b) / delta + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function formatRgb(color) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function formatHsl(color) {
  const hsl = rgbToHsl(color);
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

export function getColorDistance(a, b) {
  const red = a.r - b.r;
  const green = a.g - b.g;
  const blue = a.b - b.b;
  return red * red + green * green + blue * blue;
}

export function quantizeChannel(value, bucketSize = 24) {
  return Math.round(clampNumber(value, 0, 0, 255) / bucketSize) * bucketSize;
}

export function collectColorBuckets(pixels, settings = DEFAULT_SETTINGS) {
  const sampleStep = clampNumber(settings.sampleStep, DEFAULT_SETTINGS.sampleStep, 1, 24);
  const buckets = new Map();

  for (let index = 0; index < pixels.length; index += 4 * sampleStep) {
    const alpha = pixels[index + 3];
    if (settings.ignoreTransparent && alpha < 16) continue;
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const key = `${quantizeChannel(r)}-${quantizeChannel(g)}-${quantizeChannel(b)}`;
    const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values()).map((bucket) => ({
    r: Math.round(bucket.r / bucket.count),
    g: Math.round(bucket.g / bucket.count),
    b: Math.round(bucket.b / bucket.count),
    count: bucket.count,
  }));
}

export function mergeSimilarColors(colors, maxColors) {
  const sorted = [...colors].sort((a, b) => b.count - a.count);
  const selected = [];
  const minDistance = 28 * 28;

  sorted.forEach((color) => {
    const existing = selected.find((item) => getColorDistance(item, color) < minDistance);
    if (existing) {
      const total = existing.count + color.count;
      existing.r = Math.round((existing.r * existing.count + color.r * color.count) / total);
      existing.g = Math.round((existing.g * existing.count + color.g * color.count) / total);
      existing.b = Math.round((existing.b * existing.count + color.b * color.count) / total);
      existing.count = total;
      return;
    }
    if (selected.length < maxColors) selected.push({ ...color });
  });

  return selected;
}

export function buildPaletteFromPixels(pixels, settings = DEFAULT_SETTINGS) {
  const colorCount = clampNumber(settings.colorCount, DEFAULT_SETTINGS.colorCount, 2, 16);
  const buckets = collectColorBuckets(pixels, settings);
  const merged = mergeSimilarColors(buckets, colorCount);
  const total = merged.reduce((sum, color) => sum + color.count, 0) || 1;

  return merged.map((color, index) => {
    const normalized = { r: color.r, g: color.g, b: color.b };
    return {
      id: `color-${index + 1}`,
      name: `color-${index + 1}`,
      hex: rgbToHex(normalized),
      rgb: formatRgb(normalized),
      hsl: formatHsl(normalized),
      r: normalized.r,
      g: normalized.g,
      b: normalized.b,
      percentage: Math.round((color.count / total) * 1000) / 10,
    };
  });
}

export function makeCssVariables(colors, prefix = "palette") {
  const safePrefix = String(prefix || "palette").trim().replace(/[^a-zA-Z0-9_-]+/g, "-") || "palette";
  return colors.map((color, index) => `--${safePrefix}-${index + 1}: ${color.hex};`).join("\n");
}

export function makePaletteJson(colors, imageInfo = {}) {
  return JSON.stringify(
    {
      image: imageInfo,
      colors,
      cssVariables: makeCssVariables(colors),
    },
    null,
    2
  );
}

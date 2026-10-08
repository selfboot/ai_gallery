import DOMPurify from "dompurify";

export const SVGPNG_ACCEPT = ".svg,image/svg+xml";

export const OUTPUT_FORMATS = {
  PNG: "png",
  JPG: "jpg",
};

export const DEFAULT_SETTINGS = {
  width: 1024,
  height: 1024,
  scale: 1,
  outputFormat: OUTPUT_FORMATS.PNG,
  backgroundColor: "#ffffff",
  transparentBackground: true,
  quality: 0.92,
};

export function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function parseSafeSvg(svgText) {
  // Reuse the sanitizer's detached DOM instead of reparsing user-controlled text.
  // All consumers, including blob previews/exports, use this sanitized SVG.
  const fragment = DOMPurify.sanitize(String(svgText || "").trim(), {
    USE_PROFILES: { svg: true, svgFilters: true },
    RETURN_DOM_FRAGMENT: true,
  });
  const svg = fragment.firstElementChild;
  if (fragment.childElementCount !== 1 || svg.localName !== "svg" || svg.namespaceURI !== "http://www.w3.org/2000/svg") {
    throw new Error("invalid_svg");
  }
  return svg;
}

export function getSvgSize(svgText) {
  const fallback = { width: DEFAULT_SETTINGS.width, height: DEFAULT_SETTINGS.height };
  if (!svgText) return fallback;

  try {
    const svg = parseSafeSvg(svgText);

    const width = parseSvgLength(svg.getAttribute("width"));
    const height = parseSvgLength(svg.getAttribute("height"));
    if (width && height) return { width, height };

    const viewBox = svg.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
        return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
      }
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function parseSvgLength(value) {
  if (!value) return 0;
  const match = String(value).trim().match(/^([\d.]+)/);
  if (!match) return 0;
  const number = Number(match[1]);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

export function validateSvg(svgText) {
  const text = String(svgText || "").trim();
  if (!text) return { valid: false, error: "empty" };
  try {
    parseSafeSvg(text);
    return { valid: true, error: "" };
  } catch {
    return { valid: false, error: "invalid" };
  }
}

export function getMimeType(format) {
  return format === OUTPUT_FORMATS.JPG ? "image/jpeg" : "image/png";
}

export function getFileName(format) {
  return format === OUTPUT_FORMATS.JPG ? "converted-svg.jpg" : "converted-svg.png";
}

export function makeSvgBlobUrl(svgText) {
  const clean = new XMLSerializer().serializeToString(parseSafeSvg(svgText));
  return URL.createObjectURL(new Blob([clean], { type: "image/svg+xml;charset=utf-8" }));
}

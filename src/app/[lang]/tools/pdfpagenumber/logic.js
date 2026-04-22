export const PAGE_SELECTION_MODES = ["all", "custom"];
export const PAGE_NUMBER_POSITIONS = [
  "topLeft",
  "topCenter",
  "topRight",
  "bottomLeft",
  "bottomCenter",
  "bottomRight",
];

export const PAGE_NUMBER_FORMATS = ["number", "pageNumber", "currentOfTotal", "custom"];
export const PAGE_NUMBER_WEIGHTS = ["regular", "bold"];

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function makeOutputFileName(fileName) {
  const baseName = fileName?.replace(/\.pdf$/i, "") || "page-number";
  return `${baseName}-numbered.pdf`;
}

export function hexToRgb(hexColor) {
  const hex = `${hexColor || ""}`.replace("#", "").trim();
  const normalized = hex.length === 3 ? hex.split("").map((char) => `${char}${char}`).join("") : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return { r: 0.22, g: 0.27, b: 0.35 };
  }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16) / 255,
    g: Number.parseInt(normalized.slice(2, 4), 16) / 255,
    b: Number.parseInt(normalized.slice(4, 6), 16) / 255,
  };
}

export function parsePageSelection(mode, rangeText, pageCount) {
  if (mode !== "custom") {
    return new Set(Array.from({ length: pageCount }, (_, index) => index));
  }

  const text = `${rangeText || ""}`.trim();
  if (!text) {
    throw new Error("missing page range");
  }

  const pages = new Set();
  const segments = text.split(",").map((item) => item.trim()).filter(Boolean);
  if (segments.length === 0) {
    throw new Error("missing page range");
  }

  segments.forEach((segment) => {
    const rangeMatch = segment.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1], 10);
      const end = Number.parseInt(rangeMatch[2], 10);
      if (start < 1 || end < 1 || start > end || end > pageCount) {
        throw new Error("invalid page range");
      }
      for (let page = start; page <= end; page += 1) {
        pages.add(page - 1);
      }
      return;
    }

    const page = Number.parseInt(segment, 10);
    if (!Number.isInteger(page) || page < 1 || page > pageCount) {
      throw new Error("invalid page range");
    }
    pages.add(page - 1);
  });

  if (pages.size === 0) {
    throw new Error("missing page range");
  }

  return pages;
}

export function buildPageNumberText(format, value, total, customTemplate = "") {
  if (format === "custom") {
    const template = `${customTemplate || ""}`.trim();
    if (!template) {
      return `${value}`;
    }
    return template.replace(/\{n\}/g, `${value}`).replace(/\{total\}/g, `${total}`);
  }
  if (format === "pageNumber") {
    return `Page ${value}`;
  }
  if (format === "currentOfTotal") {
    return `${value} / ${total}`;
  }
  return `${value}`;
}

export function getPositionedPoint({ pageWidth, pageHeight, textWidth, textHeight, position, margin = 28 }) {
  const xMap = {
    topLeft: margin,
    bottomLeft: margin,
    topCenter: (pageWidth - textWidth) / 2,
    bottomCenter: (pageWidth - textWidth) / 2,
    topRight: pageWidth - textWidth - margin,
    bottomRight: pageWidth - textWidth - margin,
  };

  const yMap = {
    topLeft: pageHeight - textHeight - margin,
    topCenter: pageHeight - textHeight - margin,
    topRight: pageHeight - textHeight - margin,
    bottomLeft: margin,
    bottomCenter: margin,
    bottomRight: margin,
  };

  return {
    x: Math.max(0, xMap[position] ?? xMap.bottomCenter),
    y: Math.max(0, yMap[position] ?? yMap.bottomCenter),
  };
}

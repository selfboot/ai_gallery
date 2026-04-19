export const IMAGE_INSERT_MODES = {
  auto: { labelKey: "pdfaddimage_insert_mode_auto" },
  single: { labelKey: "pdfaddimage_insert_mode_single" },
};

export const PAGE_NUMBER_POSITIONS = {
  bottomCenter: { labelKey: "pdfaddimage_page_number_bottom_center" },
  bottomRight: { labelKey: "pdfaddimage_page_number_bottom_right" },
  bottomLeft: { labelKey: "pdfaddimage_page_number_bottom_left" },
  topCenter: { labelKey: "pdfaddimage_page_number_top_center" },
  topRight: { labelKey: "pdfaddimage_page_number_top_right" },
  topLeft: { labelKey: "pdfaddimage_page_number_top_left" },
};

export function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function sanitizeFileName(value) {
  return String(value || "document")
    .replace(/\.[^.]+$/, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim() || "document";
}

export function makeOutputFileName(fileName) {
  return `${sanitizeFileName(fileName)}_with_images.pdf`;
}

export function clampInsertAfterPage(value, pageCount) {
  const maxPage = Math.max(Number(pageCount) || 0, 0);
  const page = Number.parseInt(value, 10);
  if (!Number.isFinite(page) || page < 0) {
    return 0;
  }
  return Math.min(page, maxPage);
}

export function getImageLayoutWeight(image) {
  const ratio = image.width / image.height || 1;
  return ratio > 1.35 ? 2 : 1;
}

export function groupImagesForAutoLayout(images, maxWeight = 4) {
  const groups = [];
  let current = [];
  let currentWeight = 0;

  images.forEach((image) => {
    const weight = getImageLayoutWeight(image);
    if (current.length > 0 && currentWeight + weight > maxWeight) {
      groups.push(current);
      current = [];
      currentWeight = 0;
    }
    current.push(image);
    currentWeight += weight;
  });

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
}

export function getAutoGridBoxes({ pageWidth, pageHeight, count, margin = 36, gap = 18 }) {
  const safeMargin = Math.max(Number(margin) || 0, 0);
  const safeGap = Math.max(Number(gap) || 0, 0);
  const safeCount = Math.max(Number(count) || 1, 1);
  const columns = safeCount === 1 ? 1 : safeCount === 2 ? 1 : 2;
  const rows = Math.ceil(safeCount / columns);
  const contentWidth = Math.max(pageWidth - safeMargin * 2 - safeGap * (columns - 1), 1);
  const contentHeight = Math.max(pageHeight - safeMargin * 2 - safeGap * (rows - 1), 1);
  const cellWidth = contentWidth / columns;
  const cellHeight = contentHeight / rows;

  return Array.from({ length: safeCount }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: safeMargin + column * (cellWidth + safeGap),
      y: pageHeight - safeMargin - (row + 1) * cellHeight - row * safeGap,
      width: cellWidth,
      height: cellHeight,
    };
  });
}

export function fitImageIntoBox({ box, imageWidth, imageHeight }) {
  const ratio = imageWidth / imageHeight || 1;
  let width = box.width;
  let height = width / ratio;

  if (height > box.height) {
    height = box.height;
    width = height * ratio;
  }

  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  };
}

export function getPageNumberDrawPosition({ pageWidth, pageHeight, textWidth, fontSize, position, margin = 28 }) {
  const safeMargin = Math.max(Number(margin) || 0, 0);
  const xMap = {
    bottomLeft: safeMargin,
    topLeft: safeMargin,
    bottomRight: pageWidth - safeMargin - textWidth,
    topRight: pageWidth - safeMargin - textWidth,
    bottomCenter: (pageWidth - textWidth) / 2,
    topCenter: (pageWidth - textWidth) / 2,
  };
  const yMap = {
    bottomLeft: safeMargin,
    bottomRight: safeMargin,
    bottomCenter: safeMargin,
    topLeft: pageHeight - safeMargin - fontSize,
    topRight: pageHeight - safeMargin - fontSize,
    topCenter: pageHeight - safeMargin - fontSize,
  };

  return {
    x: xMap[position] ?? xMap.bottomCenter,
    y: yMap[position] ?? yMap.bottomCenter,
  };
}

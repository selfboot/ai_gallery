export const PDF_IMAGE_SCALE_OPTIONS = {
  1: { labelKey: "pdfimage_scale_1", scale: 1 },
  1.5: { labelKey: "pdfimage_scale_1_5", scale: 1.5 },
  2: { labelKey: "pdfimage_scale_2", scale: 2 },
  3: { labelKey: "pdfimage_scale_3", scale: 3 },
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

export function getImageMimeType(format) {
  return format === "png" ? "image/png" : "image/jpeg";
}

export function makePageImageName(fileName, pageNumber, format) {
  const baseName = sanitizeFileName(fileName);
  const extension = format === "png" ? "png" : "jpg";
  return `${baseName}_page_${String(pageNumber).padStart(3, "0")}.${extension}`;
}

export function makeZipName(fileName) {
  return `${sanitizeFileName(fileName)}_images.zip`;
}

export function summarizeImages(items) {
  return {
    count: items.length,
    totalSize: items.reduce((sum, item) => sum + (item.size || 0), 0),
  };
}

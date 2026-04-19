export const PDF_COMPRESS_PRESETS = {
  balanced: {
    labelKey: "pdfcompress_preset_balanced",
    descriptionKey: "pdfcompress_preset_balanced_hint",
    scale: 1.5,
    jpegQuality: 0.78,
  },
  smaller: {
    labelKey: "pdfcompress_preset_smaller",
    descriptionKey: "pdfcompress_preset_smaller_hint",
    scale: 1.2,
    jpegQuality: 0.62,
  },
  clearer: {
    labelKey: "pdfcompress_preset_clearer",
    descriptionKey: "pdfcompress_preset_clearer_hint",
    scale: 2,
    jpegQuality: 0.88,
  },
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

export function makeCompressedPdfName(fileName) {
  return `${sanitizeFileName(fileName)}_compressed.pdf`;
}

export function makeCompressedPdfZipName() {
  return `compressed_pdfs_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.zip`;
}

export function makeUniqueFileName(fileName, usedNames) {
  if (!usedNames.has(fileName)) {
    usedNames.add(fileName);
    return fileName;
  }

  const extensionMatch = fileName.match(/(\.[^.]+)$/);
  const extension = extensionMatch ? extensionMatch[1] : "";
  const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
  let index = 2;
  let nextName = `${baseName}_${index}${extension}`;
  while (usedNames.has(nextName)) {
    index += 1;
    nextName = `${baseName}_${index}${extension}`;
  }
  usedNames.add(nextName);
  return nextName;
}

export function calculateSavingPercent(originalSize, outputSize) {
  if (!originalSize || originalSize <= 0) {
    return 0;
  }
  return Math.round(((originalSize - outputSize) / originalSize) * 100);
}

export function getCompressionSummary(originalSize, outputSize) {
  const savingPercent = calculateSavingPercent(originalSize, outputSize);
  return {
    originalSize,
    outputSize,
    savingPercent,
    isSmaller: outputSize < originalSize,
    changedSize: outputSize - originalSize,
  };
}

export function getPresetConfig(preset) {
  return PDF_COMPRESS_PRESETS[preset] || PDF_COMPRESS_PRESETS.balanced;
}

export function summarizePdfCompression(items) {
  const originalSize = items.reduce((sum, item) => sum + (item.originalSize || 0), 0);
  const outputSize = items.reduce((sum, item) => sum + (item.outputSize || 0), 0);
  return {
    count: items.length,
    originalSize,
    outputSize,
    savingPercent: calculateSavingPercent(originalSize, outputSize),
  };
}

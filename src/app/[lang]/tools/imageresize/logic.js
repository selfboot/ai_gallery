export const OUTPUT_FORMATS = {
  original: { labelKey: "imageresize_format_original" },
  jpeg: { labelKey: "imageresize_format_jpeg" },
  png: { labelKey: "imageresize_format_png" },
  webp: { labelKey: "imageresize_format_webp" },
};

export function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
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
  return `${baseName}_resized.${getExtensionFromMime(mimeType)}`;
}

export function makeZipName() {
  return "resized-images.zip";
}

function clampPositiveNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }
  return number;
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

export function getTargetSize(image, settings) {
  const originalWidth = Math.max(1, Math.round(image.width));
  const originalHeight = Math.max(1, Math.round(image.height));
  const targetWidth = Math.round(clampPositiveNumber(settings.targetWidth));
  const targetHeight = Math.round(clampPositiveNumber(settings.targetHeight));
  const scalePercent = clampPositiveNumber(settings.scalePercent) || 100;

  if (settings.resizeMode === "exact") {
    return {
      width: targetWidth || originalWidth,
      height: targetHeight || originalHeight,
    };
  }

  if (settings.resizeMode === "scale") {
    const ratio = scalePercent / 100;
    return {
      width: Math.max(1, Math.round(originalWidth * ratio)),
      height: Math.max(1, Math.round(originalHeight * ratio)),
    };
  }

  if (settings.resizeMode === "fit") {
    if (settings.fitBy === "height") {
      const resolvedHeight = targetHeight || originalHeight;
      return {
        width: Math.max(1, Math.round((originalWidth / originalHeight) * resolvedHeight)),
        height: resolvedHeight,
      };
    }

    const resolvedWidth = targetWidth || originalWidth;
    return {
      width: resolvedWidth,
      height: Math.max(1, Math.round((originalHeight / originalWidth) * resolvedWidth)),
    };
  }

  if (targetWidth > 0 && targetHeight > 0) {
    const scale = Math.min(targetWidth / originalWidth, targetHeight / originalHeight);
    return {
      width: Math.max(1, Math.round(originalWidth * scale)),
      height: Math.max(1, Math.round(originalHeight * scale)),
    };
  }

  if (targetWidth > 0) {
    return {
      width: targetWidth,
      height: Math.max(1, Math.round((originalHeight / originalWidth) * targetWidth)),
    };
  }

  if (targetHeight > 0) {
    return {
      width: Math.max(1, Math.round((originalWidth / originalHeight) * targetHeight)),
      height: targetHeight,
    };
  }

  return {
    width: originalWidth,
    height: originalHeight,
  };
}

export function getDrawPlan(image, settings, targetSize) {
  const originalWidth = Math.max(1, Math.round(image.width));
  const originalHeight = Math.max(1, Math.round(image.height));

  if (settings.resizeMode === "exact" && settings.exactMode === "crop") {
    const widthScale = targetSize.width / originalWidth;
    const heightScale = targetSize.height / originalHeight;
    const coverScale = Math.max(widthScale, heightScale);
    const sourceWidth = Math.max(1, Math.round(targetSize.width / coverScale));
    const sourceHeight = Math.max(1, Math.round(targetSize.height / coverScale));
    const anchor = getAnchorRatio(settings.cropPosition);
    const maxSourceX = Math.max(0, originalWidth - sourceWidth);
    const maxSourceY = Math.max(0, originalHeight - sourceHeight);

    return {
      sourceX: Math.round(maxSourceX * anchor.x),
      sourceY: Math.round(maxSourceY * anchor.y),
      sourceWidth,
      sourceHeight,
      destX: 0,
      destY: 0,
      destWidth: targetSize.width,
      destHeight: targetSize.height,
    };
  }

  return {
    sourceX: 0,
    sourceY: 0,
    sourceWidth: originalWidth,
    sourceHeight: originalHeight,
    destX: 0,
    destY: 0,
    destWidth: targetSize.width,
    destHeight: targetSize.height,
  };
}

export function summarizeResults(items) {
  return {
    count: items.length,
    originalSize: items.reduce((sum, item) => sum + item.originalSize, 0),
    outputSize: items.reduce((sum, item) => sum + item.outputSize, 0),
  };
}

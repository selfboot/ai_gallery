export function normalizeRotationAngle(angle) {
  const normalized = ((Number(angle) || 0) % 360 + 360) % 360;
  if (normalized >= 315 || normalized < 45) return 0;
  if (normalized < 135) return 90;
  if (normalized < 225) return 180;
  return 270;
}

export function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  return `${(size / 1024).toFixed(1)} KB`;
}

export function getVisualPageSize(width, height, rotation) {
  const normalizedRotation = normalizeRotationAngle(rotation);
  if (normalizedRotation === 90 || normalizedRotation === 270) {
    return {
      width: height,
      height: width,
    };
  }

  return {
    width,
    height,
  };
}

export function getVisualOrientation(width, height, rotation) {
  const visualSize = getVisualPageSize(width, height, rotation);
  return visualSize.height >= visualSize.width ? "portrait" : "landscape";
}

export function summarizePages(items) {
  const rotatedPages = items.filter((item) => item.rotation !== 0).length;
  const portraitPages = items.filter((item) => item.visualOrientation === "portrait").length;
  const landscapePages = items.filter((item) => item.visualOrientation === "landscape").length;

  return {
    totalPages: items.length,
    rotatedPages,
    portraitPages,
    landscapePages,
  };
}

export function makeOutputFileName(fileName) {
  const baseName = String(fileName || "document")
    .replace(/\.pdf$/i, "")
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "document";

  return `${baseName}_print_fixed.pdf`;
}

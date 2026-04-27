export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function makeTransparentPngName(fileName) {
  const baseName = String(fileName || "image").replace(/\.[^.]+$/, "") || "image";
  return `${baseName}_background_removed.png`;
}

export function makeZipName() {
  return `background_removed_images_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.zip`;
}

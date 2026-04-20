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
  const baseName = fileName?.replace(/\.pdf$/i, "") || "signed";
  return `${baseName}-signed.pdf`;
}

export function clampPlacementToPage(placement, pageSize) {
  if (!placement || !pageSize?.width || !pageSize?.height) {
    return placement;
  }

  const minWidth = 48;
  const minHeight = 24;
  const width = Math.min(Math.max(placement.width, minWidth), pageSize.width);
  const height = Math.min(Math.max(placement.height, minHeight), pageSize.height);
  const x = Math.min(Math.max(placement.x, 0), Math.max(pageSize.width - width, 0));
  const y = Math.min(Math.max(placement.y, 0), Math.max(pageSize.height - height, 0));

  return {
    ...placement,
    x,
    y,
    width,
    height,
  };
}

export function createDefaultPlacement({ pageIndex, pageSize, imageSize }) {
  const pageWidth = pageSize?.width || 600;
  const pageHeight = pageSize?.height || 800;
  const imageRatio = imageSize?.width && imageSize?.height ? imageSize.width / imageSize.height : 3;
  const width = Math.min(pageWidth * 0.36, 220);
  const height = Math.max(36, width / imageRatio);

  return clampPlacementToPage(
    {
      pageIndex,
      x: pageWidth - width - 40,
      y: pageHeight - height - 72,
      width,
      height,
    },
    pageSize
  );
}

export function uiPlacementToPdfPlacement(placement, pageHeight, renderScale) {
  return {
    pageIndex: placement.pageIndex,
    x: placement.x / renderScale,
    y: pageHeight - (placement.y + placement.height) / renderScale,
    width: placement.width / renderScale,
    height: placement.height / renderScale,
  };
}


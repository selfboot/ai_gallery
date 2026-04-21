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
  const baseName = fileName?.replace(/\.pdf$/i, "") || "whiteout";
  return `${baseName}-whiteout.pdf`;
}

export function clampAreaToPage(area, pageSize) {
  if (!area || !pageSize?.width || !pageSize?.height) {
    return area;
  }

  const minWidth = 4;
  const minHeight = 4;
  const width = Math.min(Math.max(area.width, minWidth), pageSize.width);
  const height = Math.min(Math.max(area.height, minHeight), pageSize.height);
  const x = Math.min(Math.max(area.x, 0), Math.max(pageSize.width - width, 0));
  const y = Math.min(Math.max(area.y, 0), Math.max(pageSize.height - height, 0));

  return {
    ...area,
    x,
    y,
    width,
    height,
  };
}

export function createAreaFromDrag({ id, pageIndex, startX, startY, currentX, currentY, pageSize }) {
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  return clampAreaToPage(
    {
      id,
      pageIndex,
      x,
      y,
      width,
      height,
    },
    pageSize
  );
}

export function uiAreaToPdfRect(area, pdfPageWidth, pdfPageHeight, uiPageWidth, uiPageHeight) {
  const widthScale = uiPageWidth > 0 ? pdfPageWidth / uiPageWidth : 1;
  const heightScale = uiPageHeight > 0 ? pdfPageHeight / uiPageHeight : 1;

  return {
    pageIndex: area.pageIndex,
    x: area.x * widthScale,
    y: pdfPageHeight - (area.y + area.height) * heightScale,
    width: area.width * widthScale,
    height: area.height * heightScale,
  };
}

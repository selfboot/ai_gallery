export function moveItem(items, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return items;
  }

  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

export function rotatePageItem(item, delta = 90) {
  return {
    ...item,
    rotation: (((item.rotation || 0) + delta) % 360 + 360) % 360,
  };
}

export function removePageItem(items, index) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function makeOutputFileName(fileName) {
  const baseName = String(fileName || "document").replace(/\.[^.]+$/, "") || "document";
  return `${baseName}_organized_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.pdf`;
}

export function getVisiblePageStats(originalPageCount, pages) {
  return {
    originalPageCount,
    outputPageCount: pages.length,
    deletedPageCount: Math.max(originalPageCount - pages.length, 0),
    rotatedPageCount: pages.filter((page) => page.rotation % 360 !== 0).length,
  };
}

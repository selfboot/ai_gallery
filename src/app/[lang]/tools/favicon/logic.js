export const FAVICON_ACCEPT = ".jpg,.jpeg,.png,.webp";

export const FAVICON_PNG_SIZES = [16, 32, 48, 64, 96, 128, 180, 192, 256, 512];
export const ICO_SIZES = [16, 32, 48];

export function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function makeImageId(file) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

export function makeZipName() {
  return `favicon_package_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.zip`;
}

export function canvasToBlob(canvas, mimeType = "image/png", quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("canvas export failed"));
        }
      },
      mimeType,
      quality
    );
  });
}

export function drawFaviconCanvas(image, size, settings = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, size, size);
  if (settings.backgroundMode === "solid") {
    context.fillStyle = settings.backgroundColor || "#ffffff";
    context.fillRect(0, 0, size, size);
  }

  const paddingRatio = Number(settings.paddingRatio) || 0;
  const targetSize = Math.max(1, Math.round(size * (1 - paddingRatio * 2)));
  const sourceRatio = image.width / image.height;
  const targetRatio = 1;

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.width;
  let sourceHeight = image.height;

  if (settings.fitMode === "cover") {
    if (sourceRatio > targetRatio) {
      sourceWidth = image.height;
      sourceX = (image.width - sourceWidth) / 2;
    } else {
      sourceHeight = image.width;
      sourceY = (image.height - sourceHeight) / 2;
    }
  }

  let drawWidth = targetSize;
  let drawHeight = targetSize;
  if (settings.fitMode === "contain") {
    if (sourceRatio > 1) {
      drawHeight = Math.round(targetSize / sourceRatio);
    } else {
      drawWidth = Math.round(targetSize * sourceRatio);
    }
  }

  const drawX = Math.round((size - drawWidth) / 2);
  const drawY = Math.round((size - drawHeight) / 2);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight);

  return canvas;
}

export async function pngBlobToIcoBlob(pngEntries) {
  const buffers = await Promise.all(pngEntries.map((entry) => entry.blob.arrayBuffer()));
  const count = pngEntries.length;
  const headerSize = 6;
  const directorySize = 16 * count;
  let offset = headerSize + directorySize;
  const totalSize = offset + buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  const output = new Uint8Array(totalSize);
  const view = new DataView(output.buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, count, true);

  pngEntries.forEach((entry, index) => {
    const buffer = buffers[index];
    const entryOffset = headerSize + index * 16;
    output[entryOffset] = entry.size >= 256 ? 0 : entry.size;
    output[entryOffset + 1] = entry.size >= 256 ? 0 : entry.size;
    output[entryOffset + 2] = 0;
    output[entryOffset + 3] = 0;
    view.setUint16(entryOffset + 4, 1, true);
    view.setUint16(entryOffset + 6, 32, true);
    view.setUint32(entryOffset + 8, buffer.byteLength, true);
    view.setUint32(entryOffset + 12, offset, true);
    output.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  });

  return new Blob([output], { type: "image/x-icon" });
}

export function makeHtmlSnippet() {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="any">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
  ].join("\n");
}

export function makeManifest() {
  return JSON.stringify(
    {
      icons: [
        { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    null,
    2
  );
}

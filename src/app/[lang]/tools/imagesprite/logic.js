export const IMAGE_SPRITE_ACCEPT = ".png,.webp,.jpg,.jpeg";

export const DEFAULT_SETTINGS = {
  layout: "grid",
  gap: 8,
  columns: 4,
  backgroundMode: "transparent",
  backgroundColor: "#ffffff",
  classPrefix: "icon",
  retinaScale: 1,
};

export function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function makeImageId(file) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

export function slugifyClassName(fileName, fallbackIndex) {
  const baseName = String(fileName || `image-${fallbackIndex + 1}`).replace(/\.[^.]+$/, "");
  const slug = baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `image-${fallbackIndex + 1}`;
}

export function makeZipName() {
  return `image_sprite_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.zip`;
}

export function canvasToBlob(canvas, mimeType = "image/png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas export failed"))), mimeType);
  });
}

export function calculateSpriteLayout(images, settings) {
  const gap = Math.max(0, Math.round(Number(settings.gap) || 0));
  const columns = Math.max(1, Math.round(Number(settings.columns) || 1));

  if (settings.layout === "horizontal") {
    let x = 0;
    let height = 0;
    const frames = images.map((image, index) => {
      const frame = { ...makeFrame(image, index), x, y: 0 };
      x += image.width + gap;
      height = Math.max(height, image.height);
      return frame;
    });
    return { frames, width: Math.max(0, x - gap), height };
  }

  if (settings.layout === "vertical") {
    let y = 0;
    let width = 0;
    const frames = images.map((image, index) => {
      const frame = { ...makeFrame(image, index), x: 0, y };
      y += image.height + gap;
      width = Math.max(width, image.width);
      return frame;
    });
    return { frames, width, height: Math.max(0, y - gap) };
  }

  const rowHeights = [];
  const columnWidths = [];
  images.forEach((image, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    rowHeights[row] = Math.max(rowHeights[row] || 0, image.height);
    columnWidths[column] = Math.max(columnWidths[column] || 0, image.width);
  });

  const columnX = [];
  columnWidths.reduce((x, width, index) => {
    columnX[index] = x;
    return x + width + gap;
  }, 0);

  const rowY = [];
  rowHeights.reduce((y, height, index) => {
    rowY[index] = y;
    return y + height + gap;
  }, 0);

  const frames = images.map((image, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    return { ...makeFrame(image, index), x: columnX[column], y: rowY[row] };
  });

  return {
    frames,
    width: Math.max(0, columnWidths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, columnWidths.length - 1)),
    height: Math.max(0, rowHeights.reduce((sum, height) => sum + height, 0) + gap * Math.max(0, rowHeights.length - 1)),
  };
}

function makeFrame(image, index) {
  return {
    id: image.id,
    name: image.name,
    className: slugifyClassName(image.name, index),
    width: image.width,
    height: image.height,
  };
}

export function makeCss(frames, spriteWidth, spriteHeight, settings) {
  const prefix = String(settings.classPrefix || "icon").trim().replace(/[^a-zA-Z0-9_-]+/g, "-") || "icon";
  const retinaScale = Math.max(1, Number(settings.retinaScale) || 1);
  const backgroundSize =
    retinaScale > 1
      ? `\n  background-size: ${Math.round(spriteWidth / retinaScale)}px ${Math.round(spriteHeight / retinaScale)}px;`
      : "";

  return frames
    .map((frame) => {
      const displayWidth = Math.round(frame.width / retinaScale);
      const displayHeight = Math.round(frame.height / retinaScale);
      const x = Math.round(frame.x / retinaScale);
      const y = Math.round(frame.y / retinaScale);
      return `.${prefix}-${frame.className} {\n  display: inline-block;\n  width: ${displayWidth}px;\n  height: ${displayHeight}px;\n  background-image: url("./sprite.png");${backgroundSize}\n  background-position: -${x}px -${y}px;\n  background-repeat: no-repeat;\n}`;
    })
    .join("\n\n");
}

export function makeManifest(frames, spriteWidth, spriteHeight, settings) {
  const retinaScale = Math.max(1, Number(settings.retinaScale) || 1);
  return JSON.stringify(
    {
      image: "sprite.png",
      width: spriteWidth,
      height: spriteHeight,
      retinaScale,
      frames: frames.reduce((acc, frame) => {
        acc[frame.className] = {
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
          cssX: Math.round(frame.x / retinaScale),
          cssY: Math.round(frame.y / retinaScale),
          cssWidth: Math.round(frame.width / retinaScale),
          cssHeight: Math.round(frame.height / retinaScale),
          source: frame.name,
        };
        return acc;
      }, {}),
    },
    null,
    2
  );
}

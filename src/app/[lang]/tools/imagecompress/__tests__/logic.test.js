import {
  calculateSaving,
  formatFileSize,
  getExtensionFromMime,
  getMimeFromOutputFormat,
  getResizeDimensions,
  makeCompressedFileName,
  shouldResizeImage,
  summarizeCompression,
} from "../logic";

describe("imagecompress logic", () => {
  test("resizes images proportionally by maximum side", () => {
    expect(shouldResizeImage(4000, 3000, 2560)).toBe(true);
    expect(getResizeDimensions(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(getResizeDimensions(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });

  test("maps output formats to mime types and file names", () => {
    expect(getMimeFromOutputFormat("auto", "image/png")).toBe("image/webp");
    expect(getMimeFromOutputFormat("original", "image/png")).toBe("image/png");
    expect(getMimeFromOutputFormat("jpeg", "image/webp")).toBe("image/jpeg");
    expect(getExtensionFromMime("image/webp")).toBe("webp");
    expect(makeCompressedFileName("hero.photo.png", "image/jpeg")).toBe("hero.photo_compressed.jpg");
  });

  test("summarizes compression savings", () => {
    expect(calculateSaving(1000, 320)).toBe(68);
    expect(formatFileSize(1536)).toBe("1.50 KB");
    expect(
      summarizeCompression([
        { originalSize: 1000, outputSize: 500 },
        { originalSize: 3000, outputSize: 1000 },
      ])
    ).toEqual({
      count: 2,
      originalSize: 4000,
      outputSize: 1500,
      savingPercent: 63,
    });
  });
});

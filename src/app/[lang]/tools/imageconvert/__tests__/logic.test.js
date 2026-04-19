import {
  calculateChangePercent,
  formatFileSize,
  getExtensionFromFormat,
  getFormatFromMime,
  getMimeFromFormat,
  makeConvertedFileName,
  makeUniqueFileName,
  summarizeConvertedImages,
} from "../logic";

describe("imageconvert logic", () => {
  test("maps formats, mime types, and file names", () => {
    expect(getMimeFromFormat("jpeg")).toBe("image/jpeg");
    expect(getMimeFromFormat("png")).toBe("image/png");
    expect(getMimeFromFormat("webp")).toBe("image/webp");
    expect(getMimeFromFormat("avif")).toBe("image/avif");
    expect(getExtensionFromFormat("jpeg")).toBe("jpg");
    expect(getFormatFromMime("image/webp")).toBe("webp");
    expect(makeConvertedFileName("photo.large.png", "webp")).toBe("photo.large.webp");
    const usedNames = new Set();
    expect(makeUniqueFileName("photo.webp", usedNames)).toBe("photo.webp");
    expect(makeUniqueFileName("photo.webp", usedNames)).toBe("photo_2.webp");
  });

  test("summarizes converted files", () => {
    expect(formatFileSize(1536)).toBe("1.50 KB");
    expect(calculateChangePercent(1000, 750)).toBe(-25);
    expect(calculateChangePercent(1000, 1250)).toBe(25);
    expect(summarizeConvertedImages([{ originalSize: 1000, outputSize: 750 }, { originalSize: 500, outputSize: 250 }])).toEqual({
      count: 2,
      originalSize: 1500,
      outputSize: 1000,
      changePercent: -33,
    });
  });
});

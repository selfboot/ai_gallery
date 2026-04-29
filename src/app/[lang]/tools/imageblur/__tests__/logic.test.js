import {
  OUTPUT_FORMATS,
  clampRegion,
  formatFileSize,
  getMimeFromOutputFormat,
  makeOutputFileName,
  regionToPixels,
} from "../logic";

describe("imageblur logic", () => {
  test("clamps regions into image bounds", () => {
    expect(clampRegion({ x: 0.9, y: -1, width: 0.3, height: 0.2 })).toMatchObject({
      x: 0.7,
      y: 0,
      width: 0.3,
      height: 0.2,
    });
  });

  test("converts region percentages to pixels", () => {
    expect(regionToPixels({ x: 0.25, y: 0.5, width: 0.2, height: 0.1 }, 1000, 800)).toEqual({
      x: 250,
      y: 400,
      width: 200,
      height: 80,
    });
  });

  test("resolves output mime types and file names", () => {
    expect(getMimeFromOutputFormat(OUTPUT_FORMATS.ORIGINAL, "image/webp")).toBe("image/webp");
    expect(getMimeFromOutputFormat(OUTPUT_FORMATS.JPEG, "image/png")).toBe("image/jpeg");
    expect(makeOutputFileName("photo.png", "image/jpeg")).toBe("photo-redacted.jpg");
  });

  test("formats file sizes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.00 KB");
  });
});


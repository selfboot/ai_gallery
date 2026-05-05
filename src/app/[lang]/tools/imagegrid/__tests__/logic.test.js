import {
  DEFAULT_SETTINGS,
  FIT_MODES,
  OUTPUT_FORMATS,
  clampNumber,
  getDrawPlan,
  getGridSize,
  getMimeFromOutputFormat,
  makeTileName,
  sanitizeFileName,
} from "../logic";

describe("imagegrid logic", () => {
  test("calculates grid size from preset and tile size", () => {
    expect(getGridSize(DEFAULT_SETTINGS)).toEqual({ cols: 3, rows: 3, tileSize: 1080, width: 3240, height: 3240 });
    expect(getGridSize({ ...DEFAULT_SETTINGS, presetId: "panorama-3x1", tileSize: 640 })).toEqual({
      cols: 3,
      rows: 1,
      tileSize: 640,
      width: 1920,
      height: 640,
    });
  });

  test("clamps values and maps output format", () => {
    expect(clampNumber("bad", 10, 0, 20)).toBe(10);
    expect(clampNumber(100, 10, 0, 20)).toBe(20);
    expect(getMimeFromOutputFormat(OUTPUT_FORMATS.PNG)).toBe("image/png");
    expect(getMimeFromOutputFormat(OUTPUT_FORMATS.JPG)).toBe("image/jpeg");
  });

  test("creates safe tile names", () => {
    expect(sanitizeFileName("my photo!.jpg")).toBe("my-photo");
    expect(makeTileName("my photo!.jpg", 1, 2, 3, "jpg")).toBe("my-photo_grid_06_r2c3.jpg");
  });

  test("calculates cover and contain draw plans", () => {
    expect(getDrawPlan({ width: 2000, height: 1000 }, { width: 1000, height: 1000 }, { fitMode: FIT_MODES.COVER, focusX: 50, focusY: 50 })).toEqual({
      sourceX: 500,
      sourceY: 0,
      sourceWidth: 1000,
      sourceHeight: 1000,
      destX: 0,
      destY: 0,
      destWidth: 1000,
      destHeight: 1000,
    });
    expect(getDrawPlan({ width: 2000, height: 1000 }, { width: 1000, height: 1000 }, { fitMode: FIT_MODES.CONTAIN, focusX: 50, focusY: 50 })).toEqual({
      sourceX: 0,
      sourceY: 0,
      sourceWidth: 2000,
      sourceHeight: 1000,
      destX: 0,
      destY: 250,
      destWidth: 1000,
      destHeight: 500,
    });
  });
});

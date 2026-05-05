import { ALIGN_MODES, clampNumber, formatFileSize, getCompareSize, getDrawRect, hexToRgb, makeResultSummary } from "../logic";

describe("imagecompare logic", () => {
  test("clamps numeric values", () => {
    expect(clampNumber(2, 0.1, 0, 1)).toBe(1);
    expect(clampNumber(-1, 0.1, 0, 1)).toBe(0);
    expect(clampNumber("bad", 0.1, 0, 1)).toBe(0.1);
  });

  test("calculates compare canvas size", () => {
    const left = { width: 800, height: 600 };
    const right = { width: 640, height: 700 };
    expect(getCompareSize(left, right, ALIGN_MODES.CENTER)).toEqual({ width: 800, height: 700 });
    expect(getCompareSize(left, right, ALIGN_MODES.STRETCH)).toEqual({ width: 800, height: 600 });
  });

  test("calculates draw rect by alignment", () => {
    expect(getDrawRect({ width: 80, height: 40 }, { width: 100, height: 80 }, ALIGN_MODES.CENTER)).toEqual({
      x: 10,
      y: 20,
      width: 80,
      height: 40,
    });
    expect(getDrawRect({ width: 80, height: 40 }, { width: 100, height: 80 }, ALIGN_MODES.STRETCH)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    });
  });

  test("formats color and summary", () => {
    expect(hexToRgb("#ff0050")).toEqual([255, 0, 80]);
    expect(hexToRgb("bad")).toEqual([255, 0, 80]);
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(makeResultSummary({ diffPixels: 10, width: 10, height: 10 })).toEqual({
      totalPixels: 100,
      diffPixels: 10,
      diffRatio: 0.1,
      samePixels: 90,
    });
  });
});

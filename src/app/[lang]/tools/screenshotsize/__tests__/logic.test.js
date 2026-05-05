import {
  FIT_MODES,
  OUTPUT_FORMATS,
  getDrawPlan,
  getMimeFromOutputFormat,
  getPresetById,
  makeOutputFileName,
  normalizeSelectedPresetIds,
} from "../logic";

describe("screenshotsize logic", () => {
  test("finds presets and filters selected preset ids", () => {
    expect(getPresetById("opengraph")).toMatchObject({ width: 1200, height: 630 });
    expect(normalizeSelectedPresetIds(["opengraph", "bad", "x-post", "opengraph"])).toEqual(["opengraph", "x-post"]);
  });

  test("creates cover crop draw plans", () => {
    const plan = getDrawPlan({ width: 2000, height: 1000 }, { width: 1000, height: 1000 }, { fitMode: FIT_MODES.COVER, zoom: 1, focusX: 50, focusY: 50 });
    expect(plan.sourceWidth).toBe(1000);
    expect(plan.sourceHeight).toBe(1000);
    expect(plan.sourceX).toBe(500);
  });

  test("creates contain draw plans", () => {
    const plan = getDrawPlan({ width: 2000, height: 1000 }, { width: 1000, height: 1000 }, { fitMode: FIT_MODES.CONTAIN, zoom: 1, focusX: 50, focusY: 50 });
    expect(plan.destWidth).toBe(1000);
    expect(plan.destHeight).toBe(500);
    expect(plan.destY).toBe(250);
  });

  test("resolves mime types and names", () => {
    expect(getMimeFromOutputFormat(OUTPUT_FORMATS.JPEG)).toBe("image/jpeg");
    expect(makeOutputFileName("cover.png", { id: "opengraph", width: 1200, height: 630 }, "image/webp")).toBe("cover-opengraph-1200x630.webp");
  });
});


import { buildPaletteFromPixels, formatHsl, makeCssVariables, rgbToHex, rgbToHsl } from "../logic";

describe("colorpalette logic", () => {
  test("formats rgb colors as hex and hsl", () => {
    expect(rgbToHex({ r: 255, g: 128, b: 0 })).toBe("#FF8000");
    expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 });
    expect(formatHsl({ r: 0, g: 0, b: 255 })).toBe("hsl(240, 100%, 50%)");
  });

  test("extracts dominant colors from pixels", () => {
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255,
      0, 0, 255, 255,
      0, 255, 0, 0,
    ]);
    const palette = buildPaletteFromPixels(pixels, { colorCount: 2, sampleStep: 1, ignoreTransparent: true });
    expect(palette).toHaveLength(2);
    expect(palette[0].hex).toBe("#FF0000");
    expect(palette.map((color) => color.hex)).toContain("#0000FF");
  });

  test("creates css variables", () => {
    const css = makeCssVariables([{ hex: "#112233" }, { hex: "#AABBCC" }], "brand color");
    expect(css).toContain("--brand-color-1: #112233;");
    expect(css).toContain("--brand-color-2: #AABBCC;");
  });
});

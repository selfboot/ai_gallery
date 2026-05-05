import { OUTPUT_FORMATS, getFileName, getMimeType, parseSvgLength } from "../logic";

describe("svgpng logic", () => {
  test("parses svg lengths", () => {
    expect(parseSvgLength("1200px")).toBe(1200);
    expect(parseSvgLength("630")).toBe(630);
    expect(parseSvgLength("bad")).toBe(0);
  });

  test("maps output formats", () => {
    expect(getMimeType(OUTPUT_FORMATS.PNG)).toBe("image/png");
    expect(getMimeType(OUTPUT_FORMATS.JPG)).toBe("image/jpeg");
    expect(getFileName(OUTPUT_FORMATS.PNG)).toBe("converted-svg.png");
    expect(getFileName(OUTPUT_FORMATS.JPG)).toBe("converted-svg.jpg");
  });
});

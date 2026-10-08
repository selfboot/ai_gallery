import { DEFAULT_SETTINGS, OUTPUT_FORMATS, getFileName, getMimeType, getSvgSize, makeSvgBlobUrl, parseSvgLength, validateSvg } from "../logic";

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

describe("safe SVG parsing and export", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  beforeEach(() => { URL.createObjectURL = jest.fn(() => "blob:safe-svg"); });
  afterEach(() => { URL.createObjectURL = originalCreateObjectURL; });

  test("preserves dimensions, mixed-case SVG elements, filters, styles and escaped text", async () => {
    const source = `<?xml version="1.0"?>
      <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
        <defs><linearGradient id="gradient"><stop offset="0" stop-color="red"/></linearGradient>
          <filter id="blur"><feGaussianBlur stdDeviation="2"/></filter></defs>
        <rect width="100" height="100" fill="url(#gradient)" filter="url(#blur)" style="opacity:0.5"/>
        <text>A &amp; B &lt; C</text>
      </svg>`;
    expect(validateSvg(source)).toEqual({ valid: true, error: "" });
    expect(getSvgSize(source)).toEqual({ width: 1200, height: 630 });
    expect(makeSvgBlobUrl(source)).toBe("blob:safe-svg");
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("image/svg+xml;charset=utf-8");
    const doc = new DOMParser().parseFromString(await readBlob(blob), "image/svg+xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.documentElement.getAttribute("viewBox")).toBe("0 0 1200 630");
    expect(doc.querySelector("linearGradient")).not.toBeNull();
    expect(doc.querySelector("feGaussianBlur").getAttribute("stdDeviation")).toBe("2");
    expect(doc.querySelector("rect").getAttribute("style")).toBe("opacity:0.5");
    expect(doc.querySelector("text").textContent).toBe("A & B < C");
  });

  test("reads viewBox dimensions and adds a namespace for SVG snippets", async () => {
    const source = '<svg viewBox="0 0 320 180"><circle cx="90" cy="90" r="40"/></svg>';
    expect(getSvgSize(source)).toEqual({ width: 320, height: 180 });
    makeSvgBlobUrl(source);
    const doc = new DOMParser().parseFromString(await readBlob(URL.createObjectURL.mock.calls[0][0]), "image/svg+xml");
    expect(doc.documentElement.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });

  test("removes scripts, event handlers, HTML and executable links before creating a blob", async () => {
    const source = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="64" height="32" onload="alert(1)">
      <script>alert(1)</script><foreignObject><div xmlns="http://www.w3.org/1999/xhtml" onclick="alert(1)">unsafe</div></foreignObject>
      <a href="javascript:alert(1)"><rect width="64" height="32" onclick="alert(1)"/></a>
      <a xlink:href="javascript:alert(1)"><text>link</text></a>
      <animate attributeName="href" values="javascript:alert(1)"/>
    </svg>`;
    expect(validateSvg(source).valid).toBe(true);
    expect(getSvgSize(source)).toEqual({ width: 64, height: 32 });
    makeSvgBlobUrl(source);
    const text = await readBlob(URL.createObjectURL.mock.calls[0][0]);
    expect(text).not.toMatch(/script|onload|onclick|foreignObject|javascript:|animate/);
    expect(text).toContain('width="64"');
    expect(text).toContain("<rect");
  });

  test.each(["", "plain text", "<html><p>not SVG</p></html>", "<svg/><svg/>", "<math><mi>x</mi></math>"])(
    "rejects input without a single usable SVG: %s", (source) => {
      expect(validateSvg(source).valid).toBe(false);
      expect(getSvgSize(source)).toEqual({ width: DEFAULT_SETTINGS.width, height: DEFAULT_SETTINGS.height });
      expect(() => makeSvgBlobUrl(source)).toThrow("invalid_svg");
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    }
  );
});

// Inspect the exact SVG used by both preview and raster export.
function readBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

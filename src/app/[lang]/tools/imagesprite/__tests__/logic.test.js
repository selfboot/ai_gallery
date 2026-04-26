import {
  DEFAULT_SETTINGS,
  calculateSpriteLayout,
  formatFileSize,
  makeCss,
  makeManifest,
  slugifyClassName,
} from "../logic";
import { spriteIconFixtures } from "./fixtures";

describe("imagesprite logic", () => {
  test("prepares stable CSS class names from uploaded icon file names", () => {
    expect(slugifyClassName("home.png", 0)).toBe("home");
    expect(slugifyClassName("search icon.webp", 1)).toBe("search-icon");
    expect(slugifyClassName("user.profile.png", 2)).toBe("user-profile");
    expect(slugifyClassName("settings@2x.png", 3)).toBe("settings-2x");
    expect(slugifyClassName("----.png", 4)).toBe("image-5");
  });

  test("calculates pixel-accurate grid positions for mixed icon sizes", () => {
    const layout = calculateSpriteLayout(spriteIconFixtures, {
      ...DEFAULT_SETTINGS,
      layout: "grid",
      columns: 3,
      gap: 8,
    });

    expect(layout.width).toBe(64 + 8 + 40 + 8 + 48);
    expect(layout.height).toBe(40 + 8 + 64);
    expect(layout.frames.map(({ className, x, y, width, height }) => ({ className, x, y, width, height }))).toEqual([
      { className: "home", x: 0, y: 0, width: 32, height: 32 },
      { className: "search-icon", x: 72, y: 0, width: 40, height: 40 },
      { className: "user-profile", x: 120, y: 0, width: 48, height: 32 },
      { className: "settings-2x", x: 0, y: 48, width: 64, height: 64 },
      { className: "alert-badge", x: 72, y: 48, width: 24, height: 48 },
    ]);
  });

  test("calculates horizontal and vertical sprite dimensions", () => {
    const horizontal = calculateSpriteLayout(spriteIconFixtures.slice(0, 3), {
      ...DEFAULT_SETTINGS,
      layout: "horizontal",
      gap: 4,
    });
    expect(horizontal.width).toBe(32 + 4 + 40 + 4 + 48);
    expect(horizontal.height).toBe(40);
    expect(horizontal.frames.map((frame) => [frame.x, frame.y])).toEqual([[0, 0], [36, 0], [80, 0]]);

    const vertical = calculateSpriteLayout(spriteIconFixtures.slice(0, 3), {
      ...DEFAULT_SETTINGS,
      layout: "vertical",
      gap: 4,
    });
    expect(vertical.width).toBe(48);
    expect(vertical.height).toBe(32 + 4 + 40 + 4 + 32);
    expect(vertical.frames.map((frame) => [frame.x, frame.y])).toEqual([[0, 0], [0, 36], [0, 80]]);
  });

  test("generates CSS and JSON manifest from the same coordinate source", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      layout: "grid",
      columns: 3,
      gap: 8,
      classPrefix: "sprite",
      retinaScale: 2,
    };
    const layout = calculateSpriteLayout(spriteIconFixtures, settings);
    const css = makeCss(layout.frames, layout.width, layout.height, settings);
    const manifest = JSON.parse(makeManifest(layout.frames, layout.width, layout.height, settings));

    expect(css).toContain(".sprite-home");
    expect(css).toContain("background-image: url(\"./sprite.png\")");
    expect(css).toContain(`background-size: ${Math.round(layout.width / 2)}px ${Math.round(layout.height / 2)}px;`);
    expect(css).toContain("width: 16px;");
    expect(css).toContain("height: 16px;");
    expect(css).toContain("background-position: -36px -0px;");
    expect(css).toContain("background-position: -36px -24px;");

    expect(manifest.width).toBe(layout.width);
    expect(manifest.height).toBe(layout.height);
    expect(manifest.retinaScale).toBe(2);
    expect(manifest.frames["search-icon"]).toMatchObject({
      x: 72,
      y: 0,
      width: 40,
      height: 40,
      cssX: 36,
      cssY: 0,
      cssWidth: 20,
      cssHeight: 20,
      source: "search-icon.webp",
    });
    expect(manifest.frames["settings-2x"]).toMatchObject({
      x: 0,
      y: 48,
      cssX: 0,
      cssY: 24,
      cssWidth: 32,
      cssHeight: 32,
    });
  });

  test("formats file sizes used by the image list and result summary", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.50 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.00 MB");
  });
});

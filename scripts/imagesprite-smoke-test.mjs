import assert from "node:assert/strict";
import PizZip from "pizzip";
import {
  DEFAULT_SETTINGS,
  calculateSpriteLayout,
  makeCss,
  makeManifest,
} from "../src/app/[lang]/tools/imagesprite/logic.js";

const fixtureIcons = [
  { id: "fixture-home", name: "home.png", width: 32, height: 32, size: 412 },
  { id: "fixture-search", name: "search-icon.webp", width: 40, height: 40, size: 528 },
  { id: "fixture-user", name: "user.profile.png", width: 48, height: 32, size: 624 },
  { id: "fixture-settings", name: "settings@2x.png", width: 64, height: 64, size: 880 },
  { id: "fixture-alert", name: "alert badge.jpg", width: 24, height: 48, size: 390 },
];

const settings = {
  ...DEFAULT_SETTINGS,
  layout: "grid",
  columns: 3,
  gap: 8,
  classPrefix: "sprite",
  retinaScale: 2,
};

const layout = calculateSpriteLayout(fixtureIcons, settings);
const cssText = makeCss(layout.frames, layout.width, layout.height, settings);
const manifestText = makeManifest(layout.frames, layout.width, layout.height, settings);
const manifest = JSON.parse(manifestText);

assert.equal(layout.width, 168);
assert.equal(layout.height, 112);
assert.deepEqual(
  layout.frames.map(({ className, x, y, width, height }) => ({ className, x, y, width, height })),
  [
    { className: "home", x: 0, y: 0, width: 32, height: 32 },
    { className: "search-icon", x: 72, y: 0, width: 40, height: 40 },
    { className: "user-profile", x: 120, y: 0, width: 48, height: 32 },
    { className: "settings-2x", x: 0, y: 48, width: 64, height: 64 },
    { className: "alert-badge", x: 72, y: 48, width: 24, height: 48 },
  ]
);
assert.match(cssText, /\.sprite-search-icon/);
assert.match(cssText, /background-position: -36px -0px;/);
assert.match(cssText, /background-position: -36px -24px;/);
assert.equal(manifest.frames["search-icon"].x, 72);
assert.equal(manifest.frames["search-icon"].cssX, 36);

const zip = new PizZip();
zip.file("sprite.png", new Uint8Array([137, 80, 78, 71]));
zip.file("sprite.css", cssText);
zip.file("sprite.json", manifestText);
const generated = zip.generate({ type: "uint8array", compression: "DEFLATE" });
const inspected = new PizZip(generated);

assert.ok(inspected.file("sprite.png"));
assert.ok(inspected.file("sprite.css"));
assert.ok(inspected.file("sprite.json"));
assert.match(inspected.file("sprite.css").asText(), /\.sprite-settings-2x/);
assert.equal(JSON.parse(inspected.file("sprite.json").asText()).frames.home.width, 32);

console.log("imagesprite smoke test passed");
console.log(`fixtures: ${fixtureIcons.map((icon) => `${icon.name} ${icon.width}x${icon.height}`).join(", ")}`);
console.log(`sprite: ${layout.width}x${layout.height}, frames: ${layout.frames.length}`);

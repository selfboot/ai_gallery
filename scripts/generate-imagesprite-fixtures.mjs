import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "../public/test-fixtures/imagesprite");

const icons = [
  { name: "home.png", width: 32, height: 32, color: [37, 99, 235, 255], shape: "house" },
  { name: "search-icon.png", width: 40, height: 40, color: [22, 163, 74, 255], shape: "search" },
  { name: "user.profile.png", width: 48, height: 32, color: [249, 115, 22, 255], shape: "user" },
  { name: "settings@2x.png", width: 64, height: 64, color: [124, 58, 237, 255], shape: "gear" },
  { name: "alert-badge.png", width: 24, height: 48, color: [220, 38, 38, 255], shape: "alert" },
];

const crcTable = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function makePng({ width, height, color, shape }) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = rowStart + 1 + x * 4;
      const inside = isInsideShape(shape, x, y, width, height);
      raw[offset] = inside ? 255 : color[0];
      raw[offset + 1] = inside ? 255 : color[1];
      raw[offset + 2] = inside ? 255 : color[2];
      raw[offset + 3] = inside ? 255 : color[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function isInsideShape(shape, x, y, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const dx = x - cx;
  const dy = y - cy;
  if (shape === "house") return y > height * 0.48 && Math.abs(dx) < width * 0.26 || y <= height * 0.56 && Math.abs(dx) + Math.abs(y - height * 0.38) < width * 0.27;
  if (shape === "search") return Math.abs(Math.hypot(dx, dy) - width * 0.22) < 2.6 || Math.abs(dx - dy) < 2.4 && x > width * 0.55 && y > height * 0.55;
  if (shape === "user") return Math.hypot(dx, y - height * 0.35) < height * 0.18 || (Math.abs(dx) < width * 0.25 && y > height * 0.55 && y < height * 0.82);
  if (shape === "gear") return Math.hypot(dx, dy) < width * 0.18 || (Math.hypot(dx, dy) < width * 0.32 && (Math.abs(dx) < 4 || Math.abs(dy) < 4));
  if (shape === "alert") return Math.abs(dx) < width * 0.28 && y > height * 0.18 && y < height * 0.72 || Math.hypot(dx, y - height * 0.82) < 2.5;
  return Math.hypot(dx, dy) < Math.min(width, height) * 0.25;
}

await mkdir(outputDir, { recursive: true });
for (const icon of icons) {
  await writeFile(join(outputDir, icon.name), makePng(icon));
}

console.log(`generated ${icons.length} imagesprite fixture icons in ${outputDir}`);

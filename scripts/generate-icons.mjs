/**
 * Renders the app icon to PNG at the sizes a PWA install needs.
 *
 * The mark is flat geometry, so it is drawn straight into a pixel buffer and
 * encoded with Node's own zlib. That keeps an image-processing dependency out of
 * a project whose entire runtime is five packages.
 *
 *   node scripts/generate-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const LIME = [204, 255, 0, 255];
const BLACK = [0, 0, 0, 255];
const TRANSPARENT = [0, 0, 0, 0];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  // Each scanline is prefixed with filter type 0 (none).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** True when (x, y) is inside a rounded square of side `side` at `offset`. */
function insideRoundedSquare(x, y, offset, side, radius) {
  const left = offset;
  const right = offset + side;
  if (x < left || x >= right || y < left || y >= right) return false;

  const dx = Math.min(x - left, right - 1 - x);
  const dy = Math.min(y - left, right - 1 - y);
  if (dx >= radius || dy >= radius) return true;

  const cx = radius - dx;
  const cy = radius - dy;
  return cx * cx + cy * cy <= radius * radius;
}

/**
 * `maskable` fills the whole canvas, because the launcher crops it to its own
 * shape; the mark shrinks so it survives an aggressive circular mask.
 */
function drawIcon(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const plateInset = maskable ? 0 : Math.round(size * 0.06);
  const plateSide = size - plateInset * 2;
  const plateRadius = maskable ? 0 : Math.round(size * 0.18);

  const markSide = Math.round(size * (maskable ? 0.34 : 0.42));
  const markInset = Math.round((size - markSide) / 2);
  const stroke = Math.max(2, Math.round(size * (maskable ? 0.07 : 0.085)));

  const set = (x, y, [r, g, b, a]) => {
    const i = (y * size + x) * 4;
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = a;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!insideRoundedSquare(x, y, plateInset, plateSide, plateRadius)) {
        set(x, y, TRANSPARENT);
        continue;
      }

      const inMarkOuter = insideRoundedSquare(x, y, markInset, markSide, 0);
      const inMarkInner = insideRoundedSquare(x, y, markInset + stroke, markSide - stroke * 2, 0);
      set(x, y, inMarkOuter && !inMarkInner ? BLACK : LIME);
    }
  }
  return pixels;
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
];

for (const { file, size, maskable } of targets) {
  const png = encodePng(size, drawIcon(size, { maskable }));
  writeFileSync(join(OUT_DIR, file), png);
  console.log(`${file}  ${size}x${size}  ${(png.length / 1024).toFixed(1)} kB`);
}

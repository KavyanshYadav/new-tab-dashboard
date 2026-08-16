import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  // RGBA buffer
  const buffer = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const color = drawFn(x, y, width, height);
      buffer[idx] = color.r;     // R
      buffer[idx + 1] = color.g; // G
      buffer[idx + 2] = color.b; // B
      buffer[idx + 3] = color.a; // A
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression method
  ihdr[11] = 0; // Filter method
  ihdr[12] = 0; // Interlace method
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT Chunk (Scanlines with filter byte 0)
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * (width * 4 + 1);
    scanlines[scanlineOffset] = 0; // Filter: None
    buffer.copy(scanlines, scanlineOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(scanlines);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcData = chunk.subarray(4, 8 + length);
  const crc = crc32(crcData);
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Icon design: Dark rounded background (#131315) with an elegant neon cyan/green dashboard icon
function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2 - 1;

  // Normalized distance from center for rounded square
  const nx = Math.abs(x - cx) / (w / 2);
  const ny = Math.abs(y - cy) / (h / 2);
  const cornerDist = Math.pow(nx, 4) + Math.pow(ny, 4);

  if (cornerDist > 1.05) {
    return { r: 0, g: 0, b: 0, a: 0 }; // Transparent outside
  }

  // Border glow
  if (cornerDist > 0.85) {
    return { r: 50, g: 50, b: 60, a: 255 };
  }

  // Center symbol: A minimalist "+" and "D" dashboard tile grid
  const pad = w * 0.22;
  const inCenterBox = x >= pad && x <= w - pad && y >= pad && y <= h - pad;

  if (inCenterBox) {
    // Grid lines / 4 small tiles
    const midX = w / 2;
    const midY = h / 2;
    const gap = Math.max(1, Math.floor(w * 0.08));

    const isHGap = Math.abs(y - midY) < gap;
    const isVGap = Math.abs(x - midX) < gap;

    if (isHGap || isVGap) {
      return { r: 18, g: 18, b: 22, a: 255 };
    }

    // Top-left tile highlighted in accent white/green, other tiles subtle
    if (x < midX && y < midY) {
      return { r: 236, g: 236, b: 238, a: 255 }; // Bright tile
    } else if (x >= midX && y < midY) {
      return { r: 158, g: 206, b: 106, a: 255 }; // Green tile
    } else {
      return { r: 120, g: 120, b: 135, a: 255 }; // Muted tile
    }
  }

  // Dark surface body
  return { r: 19, g: 19, b: 21, a: 255 };
}

const outDir = path.join(process.cwd(), 'extension', 'icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

[16, 48, 128].forEach((size) => {
  const pngBuf = createPNG(size, size, drawIcon);
  const outPath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`Generated ${outPath} (${size}x${size}, ${pngBuf.length} bytes)`);
});

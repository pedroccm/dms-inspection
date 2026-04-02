import * as fs from 'fs';
import * as path from 'path';

/**
 * Generates a minimal valid 1x1 pixel red PNG file for upload tests.
 * The PNG is hand-crafted from raw bytes (no external dependencies).
 */
export function createTestPng(outputPath?: string): Buffer {
  // Minimal 1x1 red PNG (raw bytes)
  const png = Buffer.from([
    // PNG signature
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    // IHDR chunk
    0x00, 0x00, 0x00, 0x0d, // length = 13
    0x49, 0x48, 0x44, 0x52, // "IHDR"
    0x00, 0x00, 0x00, 0x01, // width = 1
    0x00, 0x00, 0x00, 0x01, // height = 1
    0x08,                   // bit depth = 8
    0x02,                   // color type = RGB
    0x00, 0x00, 0x00,       // compression, filter, interlace
    0x1e, 0x92, 0x6e, 0x05, // CRC
    // IDAT chunk (compressed pixel data: filter=0, R=255, G=0, B=0)
    0x00, 0x00, 0x00, 0x0c, // length = 12
    0x49, 0x44, 0x41, 0x54, // "IDAT"
    0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
    0x01, 0x01, 0x01, 0x00, // compressed data
    0x18, 0xdd, 0x8d, 0xb4, // CRC
    // IEND chunk
    0x00, 0x00, 0x00, 0x00, // length = 0
    0x49, 0x45, 0x4e, 0x44, // "IEND"
    0xae, 0x42, 0x60, 0x82, // CRC
  ]);

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, png);
  }

  return png;
}

// When run directly, generate test-photo.png in the same directory
if (require.main === module) {
  const out = path.join(__dirname, 'test-photo.png');
  createTestPng(out);
  console.log(`Created test image: ${out}`);
}

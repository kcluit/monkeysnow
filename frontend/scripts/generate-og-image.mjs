#!/usr/bin/env node
/**
 * Generates frontend/public/og-image.png (1200x630) from the monkeysnow SVG logo.
 * Uses sharp to composite the SVG centered on a dark background.
 *
 * Run once manually: npm run generate-og -w frontend
 * The output is committed to the repo.
 */

import sharp from 'sharp';
import { readFile, access } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const SVG_PATH = join(PUBLIC_DIR, 'monkeysnow.svg');
const OUTPUT_PATH = join(PUBLIC_DIR, 'og-image.png');

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const BG_COLOR = { r: 50, g: 52, b: 55, alpha: 1 };
const LOGO_SIZE = 280;

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (await fileExists(OUTPUT_PATH)) {
    console.log('og-image.png already exists. Delete it to regenerate.');
    return;
  }

  console.log('Generating og-image.png...');

  const svgBuffer = await readFile(SVG_PATH);

  const logoPng = await sharp(svgBuffer)
    .resize(LOGO_SIZE, LOGO_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Create text SVG for the site name
  const textSvg = Buffer.from(`
    <svg width="400" height="60" xmlns="http://www.w3.org/2000/svg">
      <text x="200" y="45" font-family="Arial, sans-serif" font-size="36" font-weight="bold"
        fill="#e2b714" text-anchor="middle" letter-spacing="2">
        monkeysnow
      </text>
    </svg>
  `);

  const textPng = await sharp(textSvg)
    .png()
    .toBuffer();

  const logoLeft = Math.round((OG_WIDTH - LOGO_SIZE) / 2);
  const logoTop = Math.round((OG_HEIGHT - LOGO_SIZE) / 2) - 30;
  const textLeft = Math.round((OG_WIDTH - 400) / 2);
  const textTop = logoTop + LOGO_SIZE + 10;

  await sharp({
    create: {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      channels: 4,
      background: BG_COLOR,
    },
  })
    .composite([
      { input: logoPng, left: logoLeft, top: logoTop },
      { input: textPng, left: textLeft, top: textTop },
    ])
    .png({ compressionLevel: 9 })
    .toFile(OUTPUT_PATH);

  console.log(`og-image.png written to ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('OG image generation failed:', err);
  process.exit(1);
});

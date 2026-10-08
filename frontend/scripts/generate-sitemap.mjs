#!/usr/bin/env node
/**
 * Generates frontend/public/sitemap.xml from the bundled Resorts
 * (src/data/resorts/resorts.json). Run as part of the build step.
 * Only current slugs are listed; old IDs redirect to them in the app.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const SITEMAP_PATH = join(PUBLIC_DIR, 'sitemap.xml');
const RESORTS_PATH = join(__dirname, '..', 'src', 'data', 'resorts', 'resorts.json');
const SITE_URL = 'https://monkeysnow.com';

const STATIC_ROUTES = [
  { path: '/',        changefreq: 'hourly',  priority: '1.0' },
  { path: '/about',   changefreq: 'monthly', priority: '0.4' },
  { path: '/terms',   changefreq: 'yearly',  priority: '0.2' },
  { path: '/privacy', changefreq: 'yearly',  priority: '0.2' },
];

async function readResortIds() {
  const { resorts } = JSON.parse(await readFile(RESORTS_PATH, 'utf-8'));
  return Object.keys(resorts);
}

function buildSitemapXml(resortIds) {
  const today = new Date().toISOString().split('T')[0];

  const staticEntries = STATIC_ROUTES.map(({ path, changefreq, priority }) => `
  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('');

  const resortEntries = resortIds.map(id => `
  <url>
    <loc>${SITE_URL}/resort/${encodeURIComponent(id)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticEntries}${resortEntries}
</urlset>
`;
}

async function main() {
  const resortIds = await readResortIds();
  console.log(`Found ${resortIds.length} resorts.`);

  const xml = buildSitemapXml(resortIds);
  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(SITEMAP_PATH, xml, 'utf-8');
  console.log(`Sitemap written to ${SITEMAP_PATH} (${resortIds.length + STATIC_ROUTES.length} URLs).`);
}

main().catch(err => {
  console.error('Sitemap generation failed:', err);
  process.exit(1);
});

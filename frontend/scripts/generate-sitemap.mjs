#!/usr/bin/env node
/**
 * Generates frontend/public/sitemap.xml by fetching the resort hierarchy
 * from the backend API. Run as part of the build step.
 */

import { writeFile, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const SITEMAP_PATH = join(PUBLIC_DIR, 'sitemap.xml');
const HIERARCHY_URL = 'https://snowscraper.camdvr.org/hierarchy';
const SITE_URL = 'https://monkeysnow.com';

const STATIC_ROUTES = [
  { path: '/',        changefreq: 'hourly',  priority: '1.0' },
  { path: '/about',   changefreq: 'monthly', priority: '0.4' },
  { path: '/terms',   changefreq: 'yearly',  priority: '0.2' },
  { path: '/privacy', changefreq: 'yearly',  priority: '0.2' },
];

async function fetchResortIds() {
  console.log(`Fetching hierarchy from ${HIERARCHY_URL}...`);
  const response = await fetch(HIERARCHY_URL, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Hierarchy API responded ${response.status}`);
  }
  const data = await response.json();

  const ids = [];
  for (const continent of data.continents ?? []) {
    for (const country of continent.countries ?? []) {
      for (const province of country.provinces ?? []) {
        for (const resort of province.resorts ?? []) {
          ids.push(resort.id);
        }
      }
    }
  }
  return ids;
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
  let resortIds = [];
  try {
    resortIds = await fetchResortIds();
    console.log(`Found ${resortIds.length} resorts.`);
  } catch (err) {
    console.warn(`Warning: Could not fetch hierarchy - ${err.message}`);
    console.warn('Generating sitemap with static routes only.');
  }

  const xml = buildSitemapXml(resortIds);
  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(SITEMAP_PATH, xml, 'utf-8');
  console.log(`Sitemap written to ${SITEMAP_PATH} (${resortIds.length + STATIC_ROUTES.length} URLs).`);
}

main().catch(err => {
  console.error('Sitemap generation failed:', err);
  process.exit(1);
});

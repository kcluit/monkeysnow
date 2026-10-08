#!/usr/bin/env node
/**
 * Regenerates the Resort list (src/data/resorts/resorts.json) from OpenSkiData,
 * the dataset behind OpenSkiMap.org. Run it by hand and review the git diff:
 *
 *   npm run import-resorts                                  download (at most once a day), filter, write
 *   npm run import-resorts -- --rename <old-slug> <new-slug> rename a slug; the old one keeps working
 *
 * Committed inputs, all in src/data/resorts/:
 *   registry.json   slug -> OpenSkiData source IDs and aliases. OpenSkiData's own feature IDs change
 *                   between builds, so slugs are matched on the upstream OSM / Skimap.org / Wikidata IDs.
 *   overrides.json  hand fixes keyed by slug (see README.md)
 *   resorts.json    the previous output: a Resort that vanishes upstream keeps its last-known data
 *                   until it is excluded in overrides.json
 * Outputs: resorts.json, plus report.md listing everything that needs a human decision.
 */

import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { slugify } from 'transliteration';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'src', 'data', 'resorts');
const CACHE_DIR = join(__dirname, '..', '.cache', 'openskidata');
const RESORTS_PATH = join(DATA_DIR, 'resorts.json');
const REGISTRY_PATH = join(DATA_DIR, 'registry.json');
const OVERRIDES_PATH = join(DATA_DIR, 'overrides.json');
const REPORT_PATH = join(DATA_DIR, 'report.md');

const DOWNLOADS = {
  'ski_areas.geojson': 'https://tiles.openskimap.org/geojson/ski_areas.geojson',
  'lifts.csv': 'https://tiles.openskimap.org/csv/lifts.csv',
  'metadata.json': 'https://tiles.openskimap.org/metadata.json',
};
// OpenSkiData allows automated downloads at most once a day
const DOWNLOAD_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const ATTRIBUTION =
  'Data from OpenSkiData / OpenSkiMap.org, © OpenStreetMap contributors (ODbL), Skimap.org, Who\'s On First, © Mapterhorn';

/** Countries with more Resorts than this are split into Regions in the resort picker... */
const MIN_RESORTS_FOR_REGIONS = 30;

/** ...as long as their Regions hold at least this many Resorts on average; the UK's 30 counties, mostly one Resort each, don't help anyone pick. */
const MIN_RESORTS_PER_REGION = 3;

/** Distance within which a Resort whose source IDs all changed upstream is still recognised by name. */
const RENAMED_SOURCE_MATCH_KM = 2;

// Grouped by where skiers look for them rather than strict geography: Russia, Turkey,
// the Caucasus and Cyprus sit in Europe; Greenland in North America.
const CONTINENTS = {
  'North America': ['US', 'CA', 'MX', 'GL'],
  'Europe': [
    'AD', 'AL', 'AM', 'AT', 'AZ', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES',
    'FI', 'FO', 'FR', 'GB', 'GE', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC',
    'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RU', 'SE', 'SI', 'SK', 'SM', 'TR',
    'UA', 'XK',
  ],
  'Asia': [
    'AF', 'BT', 'CN', 'IL', 'IN', 'IQ', 'IR', 'JO', 'JP', 'KG', 'KP', 'KR', 'KZ', 'LB', 'MN', 'NP',
    'PK', 'SY', 'TJ', 'TM', 'TW', 'UZ',
  ],
  'Oceania': ['AU', 'NZ'],
  'South America': ['AR', 'BO', 'BR', 'CL', 'CO', 'PE', 'VE'],
  'Africa': ['DZ', 'LS', 'MA', 'ZA'],
};
const CONTINENT_BY_COUNTRY = new Map(
  Object.entries(CONTINENTS).flatMap(([continent, codes]) => codes.map(code => [code, continent]))
);

const LATIN = /[A-Za-zÀ-ɏ]/;

// --- Small helpers ---

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

function distanceKm([lat1, lon1], [lat2, lon2]) {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function ringCentroid(ring) {
  let area = 0, x = 0, y = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }
  if (Math.abs(area) < 1e-12) {
    const n = ring.length;
    return { area: 0, point: [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n] };
  }
  return { area: Math.abs(area / 2), point: [x / (3 * area), y / (3 * area)] };
}

/** [lat, lon] of a ski area: its point, or the centroid of its (largest) polygon. */
function locationOf(geometry) {
  let lonLat;
  if (geometry.type === 'Point') {
    lonLat = geometry.coordinates;
  } else {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    lonLat = polygons
      .map(polygon => ringCentroid(polygon[0]))
      .reduce((best, c) => (c.area > best.area ? c : best)).point;
  }
  return [Number(lonLat[1].toFixed(5)), Number(lonLat[0].toFixed(5))];
}

function liftCount(statistics) {
  return Object.values(statistics?.lifts?.byType ?? {}).reduce((n, t) => n + (t.count ?? 0), 0);
}

/** Lowercase ASCII words joined by dashes; other scripts are transliterated ("太舞滑雪场" -> tai-wu-hua-xue-chang). */
const toSlug = text => slugify(text, { allowedChars: 'a-zA-Z0-9' });

/** A URL slug for a name, without generic endings: "Big White Ski Resort" -> big-white. */
function slugForName(name) {
  const slug = toSlug(name);
  let trimmed = slug.replace(/^skigebiet-/, '');
  for (let previous; previous !== trimmed;) {
    previous = trimmed;
    trimmed = trimmed.replace(/-(ski-(resort|area|centre|center|hill|station|park)|mountain-resort|ski-and-snowboard-resort|resort)$/, '');
  }
  return trimmed || slug;
}

/** OpenSkiData joins localized names with ", "; show the first Latin-script one and keep the rest searchable. */
function splitName(raw) {
  const variants = raw.split(', ').map(v => v.trim()).filter(Boolean);
  const name = variants.find(v => LATIN.test(v)) ?? variants[0];
  return { name, aka: variants.filter(v => v !== name) };
}

const sourceRef = s => `${s.type}:${s.id}`;

/** Minimal RFC 4180 parser; lifts.csv has quoted fields with commas and newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

// --- Download ---

async function download(name) {
  const path = join(CACHE_DIR, name);
  const age = await stat(path).then(s => Date.now() - s.mtimeMs, () => Infinity);
  if (age < DOWNLOAD_MAX_AGE_MS) {
    console.log(`Using cached ${name} (${(age / 3_600_000).toFixed(1)} h old).`);
  } else {
    console.log(`Downloading ${DOWNLOADS[name]} ...`);
    const res = await fetch(DOWNLOADS[name]);
    if (!res.ok) throw new Error(`Download of ${name} failed: HTTP ${res.status}`);
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path, Buffer.from(await res.arrayBuffer()));
  }
  return readFile(path, 'utf-8');
}

// --- Output formatting: one Resort per line so git diffs stay reviewable ---

function sortedObject(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

function linePerKey(obj, indent = '  ') {
  const lines = Object.entries(obj).map(([k, v]) => `${indent}  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  return lines.length ? `{\n${lines.join(',\n')}\n${indent}}` : '{}';
}

function formatResorts(doc) {
  return `{
  "attribution": ${JSON.stringify(doc.attribution)},
  "dataTimestamp": ${JSON.stringify(doc.dataTimestamp)},
  "countries": ${linePerKey(doc.countries)},
  "resorts": ${linePerKey(doc.resorts)},
  "aliases": ${linePerKey(doc.aliases)}
}
`;
}

const formatRegistry = registry => `${linePerKey(sortedObject(registry), '')}\n`;

// --- Slug rename ---

async function rename(oldSlug, newSlug) {
  const registry = await readJson(REGISTRY_PATH, {});
  const overrides = await readJson(OVERRIDES_PATH, { resorts: {} });
  const doc = await readJson(RESORTS_PATH, null);

  if (!registry[oldSlug]) throw new Error(`No Resort with slug "${oldSlug}" in the registry.`);
  if (registry[newSlug] || Object.values(registry).some(e => e.aliases?.includes(newSlug))) {
    throw new Error(`"${newSlug}" is already a slug or alias.`);
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(newSlug)) throw new Error(`"${newSlug}" is not a valid slug; try "${slugForName(newSlug)}".`);

  const entry = registry[oldSlug];
  delete registry[oldSlug];
  registry[newSlug] = { ...entry, aliases: [...(entry.aliases ?? []), oldSlug] };
  await writeFile(REGISTRY_PATH, formatRegistry(registry), 'utf-8');

  if (overrides.resorts?.[oldSlug]) {
    overrides.resorts[newSlug] = overrides.resorts[oldSlug];
    delete overrides.resorts[oldSlug];
    overrides.resorts = sortedObject(overrides.resorts);
  }
  overrides.reviewedPairs = (overrides.reviewedPairs ?? []).map(pair =>
    pair.split(/ ([>=]) /).map(part => (part === oldSlug ? newSlug : part)).join(' ')
  );
  await writeFile(OVERRIDES_PATH, `${JSON.stringify(overrides, null, 2)}\n`, 'utf-8');

  if (doc?.resorts[oldSlug]) {
    doc.resorts[newSlug] = doc.resorts[oldSlug];
    delete doc.resorts[oldSlug];
    doc.resorts = sortedObject(doc.resorts);
    for (const [alias, target] of Object.entries(doc.aliases)) {
      if (target === oldSlug) doc.aliases[alias] = newSlug;
    }
    doc.aliases = sortedObject({ ...doc.aliases, [oldSlug]: newSlug });
    await writeFile(RESORTS_PATH, formatResorts(doc), 'utf-8');
  }
  console.log(`Renamed ${oldSlug} -> ${newSlug}; "${oldSlug}" keeps working as an alias.`);
}

// --- Import ---

function isResort(p) {
  return p.status === 'operating'
    && p.activities?.includes('downhill')
    && p.sources?.length > 0
    && Boolean(p.name)
    && p.statistics?.minElevation != null
    && p.statistics?.maxElevation != null
    && liftCount(p.statistics) >= 1;
}

/** How strongly an area claims a registry slug: shared OSM IDs count most, Skimap.org IDs least (one can span several areas). */
function claimScores(area, slugBySource, slugByWikidata) {
  const scores = new Map();
  const add = (slug, points) => slug && scores.set(slug, (scores.get(slug) ?? 0) + points);
  for (const ref of area.sources) add(slugBySource.get(ref), ref.startsWith('openstreetmap:') ? 10 : 1);
  if (area.wikidata) add(slugByWikidata.get(area.wikidata), 5);
  return scores;
}

async function importResorts() {
  const [geojsonText, liftsText, metadataText] = await Promise.all(Object.keys(DOWNLOADS).map(download));
  const metadata = JSON.parse(metadataText);
  const registry = await readJson(REGISTRY_PATH, {});
  const overrides = await readJson(OVERRIDES_PATH, { resorts: {}, reviewedPairs: [] });
  const previous = await readJson(RESORTS_PATH, { resorts: {}, aliases: {} });
  const overrideFor = slug => overrides.resorts?.[slug] ?? {};

  const report = {
    vanished: [], unplaced: [], nested: [], duplicates: [], nonLatin: [], staleOverrides: [], newSlugs: [],
  };

  // 1. Read every ski area once, and where its operating lifts stand
  const lifts = parseCsv(liftsText).filter(l => l.status === 'operating');
  const liftPlaces = new Map(); // area id -> Map("country" and "country|region" -> lift count)
  for (const lift of lifts) {
    const country = lift.countries.split(';')[0];
    const region = lift.regions.split(';')[0];
    for (const areaId of lift.ski_area_ids.split(';')) {
      if (!areaId) continue;
      const counts = liftPlaces.get(areaId) ?? new Map();
      for (const key of [country, `${country}|${region}`]) counts.set(key, (counts.get(key) ?? 0) + 1);
      liftPlaces.set(areaId, counts);
    }
  }
  /** Border areas list every place they touch; use the one most of their lifts stand in. */
  const mainPlace = area => {
    const places = area.properties.places ?? [];
    const counts = liftPlaces.get(area.id);
    if (places.length < 2 || !counts) return places[0];
    const score = ({ localized: { en } = {} }) =>
      (counts.get(en?.country) ?? 0) * 10_000 + (counts.get(`${en?.country}|${en?.region}`) ?? 0);
    return [...places].sort((a, b) => score(b) - score(a))[0];
  };

  const allAreas = JSON.parse(geojsonText).features.map(f => {
    const p = f.properties;
    return {
      id: p.id,
      properties: p,
      sources: (p.sources ?? []).map(sourceRef),
      wikidata: p.wikidataID ?? null,
      loc: locationOf(f.geometry),
    };
  });
  const areaBySource = new Map();
  for (const area of allAreas) for (const ref of area.sources) if (!areaBySource.has(ref)) areaBySource.set(ref, area);

  // 2. Resorts: the filter, plus areas force-included by overrides
  const candidates = allAreas.filter(a => isResort(a.properties));
  const forced = new Map(); // area -> slug
  for (const [slug, o] of Object.entries(overrides.resorts ?? {})) {
    if (!o.include) continue;
    const area = areaBySource.get(o.include);
    if (!area) {
      report.staleOverrides.push(`\`${slug}\`: include source \`${o.include}\` is not in OpenSkiData any more`);
      continue;
    }
    forced.set(area, slug);
    if (!candidates.includes(area)) candidates.push(area);
  }

  // 3. Match Resorts to registry slugs by upstream source ID, strongest claim first
  const slugBySource = new Map();
  const slugByWikidata = new Map();
  for (const [slug, entry] of Object.entries(registry)) {
    for (const ref of entry.sources ?? []) slugBySource.set(ref, slug);
    if (entry.wikidata) slugByWikidata.set(entry.wikidata, slug);
  }
  const claims = [];
  for (const area of candidates) {
    if (forced.has(area)) continue;
    for (const [slug, score] of claimScores(area, slugBySource, slugByWikidata)) {
      claims.push({ area, slug, score, lifts: liftCount(area.properties.statistics) });
    }
  }
  claims.sort((a, b) => b.score - a.score || b.lifts - a.lifts);

  const slugOf = new Map(); // area -> slug
  const areaOf = new Map(); // slug -> area
  const assign = (area, slug) => { slugOf.set(area, slug); areaOf.set(slug, area); };
  for (const [area, slug] of forced) assign(area, slug);
  for (const { area, slug } of claims) {
    if (!slugOf.has(area) && !areaOf.has(slug)) assign(area, slug);
  }

  // Areas whose source IDs all changed upstream: recognise them by name and place
  for (const area of candidates) {
    if (slugOf.has(area)) continue;
    const name = slugForName(splitName(area.properties.name).name);
    const match = Object.entries(previous.resorts).find(([slug, r]) =>
      !areaOf.has(slug)
      && [r.name, ...(r.aka ?? [])].some(n => slugForName(n) === name)
      && distanceKm(r.loc, area.loc) <= RENAMED_SOURCE_MATCH_KM
    );
    if (match) assign(area, match[0]);
  }

  // 4. New Resorts get a slug from their name; clashes get the Region, then a number
  const taken = new Set(Object.keys(registry));
  for (const entry of Object.values(registry)) for (const alias of entry.aliases ?? []) taken.add(alias.toLowerCase());
  for (const area of candidates) {
    if (slugOf.has(area)) continue;
    const place = mainPlace(area);
    const base = slugForName(splitName(area.properties.name).name) || 'resort';
    const options = [base, `${base}-${toSlug(place?.localized?.en?.region ?? '')}`, `${base}-${toSlug(place?.iso3166_1Alpha2 ?? '')}`]
      .map(s => s.replace(/-+$/, ''));
    let slug = options.find(s => !taken.has(s));
    for (let n = 2; !slug; n++) if (!taken.has(`${base}-${n}`)) slug = `${base}-${n}`;
    taken.add(slug);
    assign(area, slug);
    report.newSlugs.push(slug);
  }

  // 5. Build Resort entries
  const resorts = {};
  for (const [slug, area] of areaOf) {
    // Excluded and unplaced areas stay in the registry too, so they keep their slug if they return
    registry[slug] = {
      ...registry[slug],
      sources: area.sources,
      ...(area.wikidata ? { wikidata: area.wikidata } : {}),
    };
    const o = overrideFor(slug);
    if (o.exclude) continue;
    const p = area.properties;
    const place = mainPlace(area);
    const country = o.country ?? place?.iso3166_1Alpha2;
    if (!country || !CONTINENT_BY_COUNTRY.has(country)) {
      report.unplaced.push(`\`${slug}\` (${p.name}): ${country ? `country \`${country}\` has no continent in CONTINENTS` : 'no country'}`);
      continue;
    }
    const { name, aka } = splitName(p.name);
    const bot = Math.round(p.statistics?.minElevation ?? NaN);
    const top = Math.round(p.statistics?.maxElevation ?? NaN);
    const region = o.region ?? place?.localized?.en?.region;
    const entry = {
      name: o.name ?? name,
      ...(aka.length || o.name ? { aka: o.name ? [name, ...aka] : aka } : {}),
      country,
      ...(region ? { region } : {}),
      loc: area.loc,
      bot: o.bot ?? bot,
      mid: o.mid ?? Math.round(((o.bot ?? bot) + (o.top ?? top)) / 2),
      top: o.top ?? top,
    };
    if ([entry.bot, entry.mid, entry.top].some(Number.isNaN)) {
      report.unplaced.push(`\`${slug}\` (${p.name}): no elevations; add bot/top in overrides.json`);
      continue;
    }
    resorts[slug] = entry;
    if (!LATIN.test(entry.name)) report.nonLatin.push(`\`${slug}\`: ${entry.name} (${place?.localized?.en?.country ?? country})`);
  }

  // 6. Resorts that vanished upstream keep their last-known data until excluded
  const today = metadata.source.openStreetMap.dataTimestamp.slice(0, 10);
  for (const [slug, last] of Object.entries(previous.resorts)) {
    if (areaOf.has(slug) || overrideFor(slug).exclude) continue;
    resorts[slug] = { ...last, missingSince: last.missingSince ?? today };
    report.vanished.push(`\`${slug}\` (${last.name}), missing since ${resorts[slug].missingSince}`);
  }

  // 7. Areas containing other Resorts (shared lifts) and same-name duplicates, minus pairs already reviewed
  const reviewed = new Set(overrides.reviewedPairs ?? []);
  const slugByAreaId = new Map([...areaOf].filter(([slug]) => resorts[slug] && !resorts[slug].missingSince).map(([slug, a]) => [a.id, slug]));
  const liftsOf = new Map();
  for (const lift of lifts) {
    for (const areaId of lift.ski_area_ids.split(';')) {
      const slug = slugByAreaId.get(areaId);
      if (!slug) continue;
      if (!liftsOf.has(slug)) liftsOf.set(slug, new Set());
      liftsOf.get(slug).add(lift.id);
    }
  }
  for (const [parent, parentLifts] of liftsOf) {
    for (const [child, childLifts] of liftsOf) {
      if (parent === child || childLifts.size > parentLifts.size) continue;
      if (childLifts.size === parentLifts.size && parent > child) continue; // identical sets: list once
      if (![...childLifts].every(l => parentLifts.has(l))) continue;
      if (reviewed.has(`${parent} > ${child}`) || reviewed.has(`${parent} > *`)) continue;
      report.nested.push({ parent, child, parentLifts: parentLifts.size, childLifts: childLifts.size });
    }
  }
  const byNameAndRegion = new Map();
  for (const [slug, r] of Object.entries(resorts)) {
    const key = `${r.country}|${r.region}|${r.name.toLowerCase()}`;
    byNameAndRegion.set(key, [...(byNameAndRegion.get(key) ?? []), slug]);
  }
  for (const slugs of byNameAndRegion.values()) {
    for (let i = 1; i < slugs.length; i++) {
      const pair = `${slugs[0]} = ${slugs[i]}`;
      if (!reviewed.has(pair)) report.duplicates.push(pair);
    }
  }

  // 8. Overrides that point at nothing
  for (const slug of Object.keys(overrides.resorts ?? {})) {
    if (!registry[slug]) report.staleOverrides.push(`\`${slug}\` is not a known slug`);
  }
  for (const pair of reviewed) {
    if (pair.split(/ [>=] /).some(slug => slug !== '*' && !resorts[slug])) {
      report.staleOverrides.push(`reviewed pair \`${pair}\` names a Resort that is gone`);
    }
  }

  // 9. Countries, and whether each is split into Regions
  const counts = {};
  const regionNames = {}; // country -> Set of its Regions; Resorts without one share "Other", as in the picker
  for (const r of Object.values(resorts)) {
    counts[r.country] = (counts[r.country] ?? 0) + 1;
    (regionNames[r.country] ??= new Set()).add(r.region ?? 'Other');
  }
  const countryNames = new Map();
  for (const area of allAreas) {
    const place = area.properties.places?.[0];
    if (place?.iso3166_1Alpha2 && place.localized?.en?.country) countryNames.set(place.iso3166_1Alpha2, place.localized.en.country);
  }
  const countries = {};
  for (const code of Object.keys(counts).sort()) {
    countries[code] = {
      name: countryNames.get(code) ?? previous.countries?.[code]?.name ?? code,
      continent: CONTINENT_BY_COUNTRY.get(code),
      regions: counts[code] > MIN_RESORTS_FOR_REGIONS
        && counts[code] / regionNames[code].size >= MIN_RESORTS_PER_REGION,
    };
  }

  // 10. Aliases: earlier slugs and pre-OpenSkiData IDs that still resolve
  const aliases = {};
  for (const [slug, entry] of Object.entries(registry)) {
    if (!resorts[slug]) continue;
    for (const alias of entry.aliases ?? []) aliases[alias] = slug;
  }

  const doc = {
    attribution: ATTRIBUTION,
    dataTimestamp: metadata.source.openStreetMap.dataTimestamp,
    countries,
    resorts: sortedObject(resorts),
    aliases: sortedObject(aliases),
  };
  await writeFile(RESORTS_PATH, formatResorts(doc), 'utf-8');
  await writeFile(REGISTRY_PATH, formatRegistry(registry), 'utf-8');
  await writeFile(REPORT_PATH, formatReport(report, doc, resorts), 'utf-8');

  console.log(`Wrote ${Object.keys(resorts).length} Resorts in ${Object.keys(countries).length} countries to ${RESORTS_PATH}.`);
  console.log(`New slugs: ${report.newSlugs.length}. Vanished: ${report.vanished.length}. New nesting pairs: ${report.nested.length}. ` +
    `Duplicates: ${report.duplicates.length}. Stale overrides: ${report.staleOverrides.length}. See ${REPORT_PATH}.`);
}

function formatReport(report, doc, resorts) {
  const section = (title, intro, items, count = items.length) => count
    ? `## ${title} (${count})\n\n${intro}\n\n${items.map(i => `- ${i}`).join('\n')}\n`
    : `## ${title}\n\nNothing to review.\n`;

  const childrenOf = new Map();
  for (const n of report.nested) childrenOf.set(n.parent, [...(childrenOf.get(n.parent) ?? []), n]);
  const nested = [...childrenOf.values()]
    .sort((a, b) => b[0].parentLifts - a[0].parentLifts)
    .map(children => {
      const { parent, parentLifts } = children[0];
      const list = children
        .sort((a, b) => b.childLifts - a.childLifts)
        .map(c => `${resorts[c.child].name} \`${c.child}\` (${c.childLifts === parentLifts ? 'same lifts' : `${c.childLifts} lifts`})`)
        .join(', ');
      return `**${resorts[parent].name}** \`${parent}\` (${parentLifts} lifts) contains ${list}`;
    });
  const newSlugs = report.newSlugs.length > 200
    ? [`${report.newSlugs.length} new slugs (list omitted)`]
    : report.newSlugs.map(s => `\`${s}\``);

  return `# Resort import report

OpenSkiData build of ${doc.dataTimestamp}: ${Object.keys(doc.resorts).length} Resorts in ${Object.keys(doc.countries).length} countries.
Everything below needs a human decision; fixes go in \`overrides.json\` (see README.md).

${section('Vanished upstream', 'These Resorts are no longer in OpenSkiData and are kept with their last-known data. Exclude each one that is really gone; fix the rest upstream in OpenStreetMap.', report.vanished)}
${section('Resorts containing other Resorts', 'Lift-pass networks and duplicates share lifts with the areas inside them. Exclude the parent or the children, or keep both by adding `"parent > child"` (or `"parent > *"` for all of a parent\'s current children) to `reviewedPairs`.', nested, report.nested.length)}
${section('Duplicate names in one Region', 'Usually one ski area split in two upstream. Exclude one, or add the quoted pair to `reviewedPairs`.', report.duplicates.map(p => `\`${p}\``))}
${section('Not placed', 'Left out: give each a `country` (and `region`) override, or exclude it.', report.unplaced)}
${section('Overrides that point at nothing', 'Remove or fix these entries in `overrides.json`.', report.staleOverrides)}
${section('No Latin-script name', 'Shown as-is. Add a `name` override for any you care about, then `--rename` its slug if you like.', report.nonLatin)}
${section('New slugs this run', 'First seen in this import.', newSlugs, report.newSlugs.length)}`;
}

const args = process.argv.slice(2);
const run = args[0] === '--rename' ? rename(args[1], args[2]) : importResorts();
run.catch(err => {
  console.error('Resort import failed:', err);
  process.exit(1);
});

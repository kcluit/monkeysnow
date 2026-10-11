#!/usr/bin/env node
/**
 * Regenerates the Ski map's squares (public/skimap/) from OpenSkiData's worldwide Runs and Lifts
 * (docs/adr/0010). Run it by hand from a worktree, roughly monthly, and commit the result; there is
 * nothing to review, since Runs and Lifts aren't identities anyone keeps:
 *
 *   npm run import-ski-map
 *
 * Each square is a zoom-12 map tile, written to public/skimap/12/<x>/<y>.json as a JSON array with
 * one Run or Lift per line, holding every one that crosses it. A square with nothing in it has no
 * file. Unchanged squares are written byte for byte the same, so a refresh only touches the squares
 * where something changed.
 */

import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, rmdirSync, writeFileSync } from 'fs';
import { mkdir, rename, stat } from 'fs/promises';
import { createInterface } from 'readline';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'skimap');
const SQUARE_ZOOM = 12;
const SQUARES_DIR = join(OUT_DIR, String(SQUARE_ZOOM));
// Shared with import-resorts, so a file both use is downloaded once
const CACHE_DIR = join(__dirname, '..', '.cache', 'openskidata');

const DOWNLOADS = {
  'runs.geojson': 'https://tiles.openskimap.org/geojson/runs.geojson',
  'lifts.geojson': 'https://tiles.openskimap.org/geojson/lifts.geojson',
  'metadata.json': 'https://tiles.openskimap.org/metadata.json',
};
// OpenSkiData allows automated downloads at most once a day
const DOWNLOAD_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// The Runs the Ski map draws, in the order a Run mapped as several is counted as the first of
const RUN_KINDS = ['downhill', 'nordic', 'skitour', 'snow_park', 'sled'];
// Aerial Lifts count everywhere; funiculars and railways only inside a Ski area, the rest being in towns and valleys
const AERIAL_LIFTS = new Set(['cable_car', 'gondola', 'mixed_lift', 'chair_lift', 'drag_lift', 't-bar', 'j-bar', 'platter', 'rope_tow', 'magic_carpet']);
const SKI_AREA_LIFTS = new Set(['funicular', 'railway']);

// About a metre
const DECIMALS = 5;

// --- Download ---

/** The path of a downloaded file, fetched again only once the copy is a day old. The Runs file is too big to hold as one string. */
async function download(name) {
  const path = join(CACHE_DIR, name);
  const age = await stat(path).then(s => Date.now() - s.mtimeMs, () => Infinity);
  if (age < DOWNLOAD_MAX_AGE_MS) {
    console.log(`Using cached ${name} (${(age / 3_600_000).toFixed(1)} h old).`);
    return path;
  }
  console.log(`Downloading ${DOWNLOADS[name]} ...`);
  const res = await fetch(DOWNLOADS[name]);
  if (!res.ok) throw new Error(`Download of ${name} failed: HTTP ${res.status}`);
  await mkdir(CACHE_DIR, { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(`${path}.part`));
  await rename(`${path}.part`, path);
  return path;
}

/** Every feature of a GeoJSON file that OpenSkiData writes one feature per line. */
async function* featuresOf(path) {
  const lines = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of lines) {
    if (line.startsWith('{"type":"Feature"')) yield JSON.parse(line);
  }
}

// --- What the Ski map draws ---

/** e.g. { kind: 'downhill', difficulty: 'easy' }, or null for a Run the Ski map leaves out */
function aboutRun(p) {
  const kind = RUN_KINDS.find(k => p.uses?.includes(k));
  if (!kind || p.status !== 'operating') return null;
  return { kind, ...(p.difficulty ? { difficulty: p.difficulty } : {}) };
}

function aboutLift(p) {
  if (p.status !== 'operating') return null;
  if (!AERIAL_LIFTS.has(p.liftType) && !(SKI_AREA_LIFTS.has(p.liftType) && p.skiAreas?.length)) return null;
  return { kind: 'lift', liftType: p.liftType };
}

/**
 * The OpenStreetMap way or relation a feature is named after, e.g. "w123": its lowest-numbered way, else its
 * lowest-numbered relation. OpenSkiData's own IDs change every build, and it often joins several ways into one Run.
 */
function sourceId(p) {
  const refs = (p.sources ?? []).filter(s => s.type === 'openstreetmap').map(s => s.id.split('/'));
  for (const type of ['way', 'relation', 'node']) {
    const ids = refs.filter(([t]) => t === type).map(([, id]) => Number(id));
    if (ids.length) return `${type[0]}${Math.min(...ids)}`;
  }
  return null;
}

const factor = 10 ** DECIMALS;
const round = v => Math.round(v * factor) / factor;

/** [lat, lon] points, rounded, without the repeats rounding leaves */
function points(coordinates) {
  const out = [];
  for (const [lon, lat] of coordinates) {
    const point = [round(lat), round(lon)];
    const last = out[out.length - 1];
    if (!last || last[0] !== point[0] || last[1] !== point[1]) out.push(point);
  }
  return out;
}

/** Each line, or the outer ring of each area, as [lat, lon] points */
function shapes(geometry) {
  switch (geometry.type) {
    case 'LineString': return [{ area: false, coords: points(geometry.coordinates) }];
    case 'MultiLineString': return geometry.coordinates.map(line => ({ area: false, coords: points(line) }));
    case 'Polygon': return [{ area: true, coords: points(geometry.coordinates[0]) }];
    case 'MultiPolygon': return geometry.coordinates.map(polygon => ({ area: true, coords: points(polygon[0]) }));
    default: return [];
  }
}

// --- Squares ---

const N = 2 ** SQUARE_ZOOM;
const MAX_LAT = 85.0511;
const tileX = lon => ((lon + 180) / 360) * N;
const tileY = lat => {
  const r = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * N;
};

/** Every square a line passes through, walking it square by square, so a long cable car counts in squares it has no point in */
function squaresAlong(coords, add) {
  for (let i = 0; i < coords.length; i++) {
    const x0 = tileX(coords[i][1]);
    const y0 = tileY(coords[i][0]);
    let cx = Math.floor(x0);
    let cy = Math.floor(y0);
    add(cx, cy);
    if (i === coords.length - 1) break;
    const x1 = tileX(coords[i + 1][1]);
    const y1 = tileY(coords[i + 1][0]);
    // A line across the antimeridian would walk the whole world the wrong way; its ends' squares are enough
    if (Math.abs(x1 - x0) > N / 2) continue;
    const ex = Math.floor(x1);
    const ey = Math.floor(y1);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    const tDeltaX = stepX ? Math.abs(1 / dx) : Infinity;
    const tDeltaY = stepY ? Math.abs(1 / dy) : Infinity;
    let tMaxX = stepX > 0 ? (cx + 1 - x0) / dx : stepX < 0 ? (cx - x0) / dx : Infinity;
    let tMaxY = stepY > 0 ? (cy + 1 - y0) / dy : stepY < 0 ? (cy - y0) / dy : Infinity;
    for (let guard = 0; (cx !== ex || cy !== ey) && guard < 4 * N; guard++) {
      if (tMaxX < tMaxY) {
        cx += stepX;
        tMaxX += tDeltaX;
      } else {
        cy += stepY;
        tMaxY += tDeltaY;
      }
      add(cx, cy);
    }
  }
}

// --- Import ---

async function importSkiMap() {
  const [runsPath, liftsPath, metadataPath] = await Promise.all(Object.keys(DOWNLOADS).map(download));
  const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));

  /** Everything drawn, before IDs are settled: one entry per line or area */
  const drawn = [];
  const counts = { run: 0, lift: 0, noSource: 0, skipped: 0 };
  for (const [path, about, counted] of [[runsPath, aboutRun, 'run'], [liftsPath, aboutLift, 'lift']]) {
    for await (const feature of featuresOf(path)) {
      const p = feature.properties;
      const kind = about(p);
      if (!kind) {
        counts.skipped++;
        continue;
      }
      const name = p.name || p.ref || undefined;
      let id = sourceId(p);
      if (!id) {
        counts.noSource++;
        id = `o${p.id.slice(0, 12)}`;
      }
      const parts = shapes(feature.geometry).filter(s => s.coords.length >= (s.area ? 4 : 2));
      parts.forEach((shape, i) => {
        drawn.push({
          id: parts.length > 1 ? `${id}#${i}` : id,
          // Sorts features that share an ID the same way on every run
          tiebreak: `${(p.sources ?? []).map(s => s.id).sort().join(',')}|${kind.kind}|${JSON.stringify(shape.coords[0])}`,
          feature: { ...kind, ...(name ? { name } : {}), ...(shape.area ? { area: true } : {}), coords: shape.coords },
        });
      });
      counts[counted]++;
    }
  }

  // Two features can be named after the same way, such as one Run mapped both as a way and in a route; number them
  const byId = new Map();
  for (const entry of drawn) {
    if (!byId.has(entry.id)) byId.set(entry.id, []);
    byId.get(entry.id).push(entry);
  }
  const lines = new Map(); // "x/y" -> [id, JSON line]
  for (const [id, entries] of byId) {
    entries.sort((a, b) => (a.tiebreak < b.tiebreak ? -1 : a.tiebreak > b.tiebreak ? 1 : 0));
    entries.forEach((entry, i) => {
      const finalId = i === 0 ? id : `${id}~${i + 1}`;
      const json = JSON.stringify({ id: finalId, ...entry.feature });
      const squares = new Set();
      squaresAlong(entry.feature.coords, (x, y) => {
        if (x >= 0 && x < N && y >= 0 && y < N) squares.add(`${x}/${y}`);
      });
      for (const square of squares) {
        if (!lines.has(square)) lines.set(square, []);
        lines.get(square).push([finalId, json]);
      }
    });
  }

  // Write what changed, and remove the squares nothing crosses any more
  const existing = new Set();
  if (existsSync(SQUARES_DIR)) {
    for (const x of readdirSync(SQUARES_DIR)) {
      for (const file of readdirSync(join(SQUARES_DIR, x))) existing.add(`${x}/${file.replace(/\.json$/, '')}`);
    }
  }
  let written = 0, unchanged = 0, bytes = 0, largest = { square: '', bytes: 0 };
  for (const [square, entries] of lines) {
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const text = `[\n${entries.map(([, json]) => json).join(',\n')}\n]\n`;
    const [x, y] = square.split('/');
    const path = join(SQUARES_DIR, x, `${y}.json`);
    bytes += text.length;
    if (text.length > largest.bytes) largest = { square, bytes: text.length };
    existing.delete(square);
    if (existsSync(path) && readFileSync(path, 'utf-8') === text) {
      unchanged++;
      continue;
    }
    mkdirSync(join(SQUARES_DIR, x), { recursive: true });
    writeFileSync(path, text);
    written++;
  }
  for (const square of existing) {
    const [x, y] = square.split('/');
    rmSync(join(SQUARES_DIR, x, `${y}.json`));
    if (readdirSync(join(SQUARES_DIR, x)).length === 0) rmdirSync(join(SQUARES_DIR, x));
  }

  // The body Netlify answers with for a square that has no file (see public/_redirects)
  writeFileSync(join(OUT_DIR, 'empty.json'), '[]\n');
  writeFileSync(join(OUT_DIR, 'README.md'), readme(metadata.source.openStreetMap.dataTimestamp.slice(0, 10)));

  console.log(`${counts.run} Runs and ${counts.lift} Lifts kept, ${counts.skipped} features left out${counts.noSource ? `, ${counts.noSource} with no OpenStreetMap source` : ''}.`);
  console.log(`${lines.size} squares, ${(bytes / 1024 / 1024).toFixed(1)} MB: ${written} written, ${unchanged} unchanged, ${existing.size} removed.`);
  console.log(`Largest square ${largest.square}: ${(largest.bytes / 1024).toFixed(0)} KB.`);
}

function readme(dataDate) {
  return `# Ski map data

The Runs and Lifts the Ski map draws, generated from [OpenSkiData](https://openskidata.org/), the dataset behind [OpenSkiMap.org](https://openskimap.org/), by \`npm run import-ski-map\` (see [ADR 0010](https://github.com/kcluit/monkeysnow/blob/main/docs/adr/0010-ski-map-built-from-openskidata-into-static-squares.md)). OpenStreetMap data as of ${dataDate}.

Data from OpenSkiData / OpenSkiMap.org, © OpenStreetMap contributors (ODbL).

These files form a derivative database and are licensed under the [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). They are not covered by MonkeySnow's code license (AGPL-3.0).

\`12/<x>/<y>.json\` holds every Run and Lift that crosses zoom-12 map tile x/y, one per line: an \`id\` named after its OpenStreetMap way (\`w\`) or relation (\`r\`), its \`kind\`, \`name\`, \`difficulty\` or \`liftType\`, \`area\` for one mapped as an area, and its \`coords\` as [lat, lon]. A square with nothing in it has no file.
`;
}

await importSkiMap();

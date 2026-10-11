/**
 * The Ski map's data: every Run and Lift around the map, from OpenStreetMap through
 * the public Overpass API, keyless (docs/adr/0007). It is fetched in squares, the
 * map's zoom-12 tiles (about 10 km across at the equator, 7 km in the Alps), and
 * each square is kept in IndexedDB for a week, since Runs and Lifts rarely change.
 */

import { idbGet, idbSet } from './indexedDB';

export type RunKind = 'downhill' | 'nordic' | 'skitour' | 'snow_park' | 'sled';

export interface SkiMapFeature {
    /** The OpenStreetMap way, e.g. "w123"; one way split by the edge of a query gets "w123#1" and so on */
    id: string;
    kind: RunKind | 'lift';
    name?: string;
    /** A Run's piste:difficulty, e.g. "intermediate" */
    difficulty?: string;
    /** A Lift's aerialway type, e.g. "chair_lift" */
    liftType?: string;
    /** A closed way mapped as an area, such as a terrain park, rather than a line */
    area: boolean;
    /** [lat, lon] pairs */
    coords: [number, number][];
}

/** Below this zoom the Ski map draws nothing: a whole region's Runs is a huge query and an unreadable map. */
export const SKI_MAP_MIN_ZOOM = 12;

const SQUARE_ZOOM = 12;
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
// The 7 by 11 km around Whistler is about 1 MB of Runs and Lifts, so a busy Alpine area is fetched a dozen squares at a time
export const MAX_SQUARES_PER_QUERY = 12;
const QUERY_TIMEOUT_MS = 30_000;

// overpass-api.de turns away requests without a Referer, which browsers send by default, and answers 504 when busy.
// The mirror was answering 500s with no CORS headers in October 2026; it is tried in case it recovers.
const OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
];

const RUN_KINDS: readonly RunKind[] = ['downhill', 'nordic', 'skitour', 'snow_park', 'sled'];
// Everything that carries skiers uphill; zip lines and goods lifts don't
const LIFT_TYPES = ['cable_car', 'gondola', 'mixed_lift', 'chair_lift', 'drag_lift', 't-bar', 'j-bar', 'platter', 'rope_tow', 'magic_carpet'];

export interface Square {
    x: number;
    y: number;
}

interface SquareData {
    fetchedAt: number;
    features: SkiMapFeature[];
}

const storageKey = (s: Square) => `skimap:${SQUARE_ZOOM}/${s.x}/${s.y}`;

// Squares read or fetched lately, so panning back doesn't go to IndexedDB again; a busy Alpine square is a few MB
const MEMORY_LIMIT = 48;
const memory = new Map<string, SquareData>();

function remember(key: string, data: SquareData): void {
    memory.delete(key);
    memory.set(key, data);
    if (memory.size > MEMORY_LIMIT) memory.delete(memory.keys().next().value!);
}

const lonToX = (lon: number) => Math.floor(((lon + 180) / 360) * 2 ** SQUARE_ZOOM);
const latToY = (lat: number) => {
    const r = (lat * Math.PI) / 180;
    return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** SQUARE_ZOOM);
};
const xToLon = (x: number) => (x / 2 ** SQUARE_ZOOM) * 360 - 180;
const yToLat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** SQUARE_ZOOM))) * 180) / Math.PI;

/** The squares covering an area, nearest its middle first. */
export function squaresCovering(south: number, west: number, north: number, east: number): Square[] {
    const squares: Square[] = [];
    for (let y = latToY(north); y <= latToY(south); y++) {
        for (let x = lonToX(west); x <= lonToX(east); x++) squares.push({ x, y });
    }
    const middleX = (lonToX(west) + lonToX(east)) / 2;
    const middleY = (latToY(north) + latToY(south)) / 2;
    return squares.sort((a, b) => Math.hypot(a.x - middleX, a.y - middleY) - Math.hypot(b.x - middleX, b.y - middleY));
}

interface Box {
    south: number;
    west: number;
    north: number;
    east: number;
}

const squareBox = (s: Square): Box => ({ south: yToLat(s.y + 1), west: xToLon(s.x), north: yToLat(s.y), east: xToLon(s.x + 1) });

const overlaps = (a: Box, b: Box) => a.south <= b.north && a.north >= b.south && a.west <= b.east && a.east >= b.west;

/**
 * What's known about some squares: the features of every one fetched before (stale ones
 * too, shown until they're refreshed), and which need fetching, in the order given.
 */
export async function readSquares(squares: Square[]): Promise<{ features: SkiMapFeature[]; needed: Square[] }> {
    const stored = await Promise.all(squares.map(async (square) => {
        const key = storageKey(square);
        const data = memory.get(key) ?? await idbGet<SquareData>(key).catch(() => undefined);
        if (data) remember(key, data);
        return data;
    }));
    const features = stored.flatMap(data => data?.features ?? []);
    const needed = squares.filter((_, i) => !stored[i] || Date.now() - stored[i]!.fetchedAt > FRESH_MS);
    return { features, needed };
}

function overpassQuery(box: Box): string {
    const bbox = `${box.south},${box.west},${box.north},${box.east}`;
    const runs = `"piste:type"~"^(${RUN_KINDS.join('|')})$"`;
    return '[out:json][timeout:25];'
        + `(way[${runs}]["piste:abandoned"!="yes"](${bbox});`
        + `way["aerialway"~"^(${LIFT_TYPES.join('|')})$"](${bbox}););`
        + 'out tags geom qt;'
        // Nordic and touring routes are often relations of untagged ways; their members are cut to the query's area
        + `relation[${runs}](${bbox});`
        + `out body geom(${bbox}) qt;`;
}

type LatLon = { lat: number; lon: number } | null;

interface OverpassElement {
    type: 'way' | 'relation';
    id: number;
    tags?: Record<string, string>;
    geometry?: LatLon[];
    members?: { type: string; ref: number; geometry?: LatLon[] }[];
}

interface OverpassResponse {
    elements: OverpassElement[];
    remark?: string;
}

/** POSTs a query to each Overpass server in turn until one answers in full. */
async function queryOverpass(query: string, signal: AbortSignal): Promise<OverpassResponse> {
    let lastError: unknown = new Error('No Overpass server answered');
    for (const server of OVERPASS_SERVERS) {
        const attempt = new AbortController();
        const abort = () => attempt.abort();
        signal.addEventListener('abort', abort);
        const timer = window.setTimeout(abort, QUERY_TIMEOUT_MS);
        try {
            // A form body keeps it a simple request, so the browser sends no CORS preflight
            const response = await fetch(server, { method: 'POST', body: new URLSearchParams({ data: query }), signal: attempt.signal });
            if (!response.ok) throw new Error(`Overpass answered ${response.status}`);
            const json = (await response.json()) as OverpassResponse;
            // A query that runs out of time or memory still answers 200, with part of the data and a remark
            if (json.remark?.includes('error')) throw new Error(json.remark);
            return json;
        } catch (error) {
            if (signal.aborted) throw error;
            lastError = error;
        } finally {
            window.clearTimeout(timer);
            signal.removeEventListener('abort', abort);
        }
    }
    throw lastError;
}

/** What a way is on the Ski map, from its own tags or those of the route relation it belongs to. */
function describe(tags: Record<string, string> | undefined): Pick<SkiMapFeature, 'kind' | 'name' | 'difficulty' | 'liftType'> | null {
    if (!tags) return null;
    const piste = tags['piste:type'] as RunKind | undefined;
    if (piste && RUN_KINDS.includes(piste)) {
        return { kind: piste, name: tags['piste:name'] ?? tags.name ?? tags.ref, difficulty: tags['piste:difficulty'] };
    }
    if (tags.aerialway && LIFT_TYPES.includes(tags.aerialway)) {
        return { kind: 'lift', name: tags.name ?? tags.ref, liftType: tags.aerialway };
    }
    return null;
}

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** A way's points as lines, split wherever the query's area cut them out. */
function toLines(geometry: LatLon[] | undefined): [number, number][][] {
    const lines: [number, number][][] = [];
    let line: [number, number][] = [];
    for (const point of geometry ?? []) {
        if (point) {
            line.push([round(point.lat), round(point.lon)]);
        } else if (line.length) {
            lines.push(line);
            line = [];
        }
    }
    if (line.length) lines.push(line);
    return lines.filter(l => l.length > 1);
}

function toFeatures(response: OverpassResponse): SkiMapFeature[] {
    const features = new Map<string, SkiMapFeature>();
    const add = (wayId: number, about: NonNullable<ReturnType<typeof describe>>, area: boolean, lines: [number, number][][]) => {
        lines.forEach((coords, i) => {
            const id = i === 0 ? `w${wayId}` : `w${wayId}#${i}`;
            if (!features.has(id)) features.set(id, { id, ...about, area, coords });
        });
    };
    // Tagged ways first, so a way that is both tagged itself and a route member keeps its own tags
    for (const element of response.elements) {
        if (element.type !== 'way') continue;
        const about = describe(element.tags);
        const lines = toLines(element.geometry);
        if (!about || !lines.length) continue;
        const [first] = lines[0];
        const lastLine = lines[lines.length - 1];
        const [lastLat, lastLon] = lastLine[lastLine.length - 1];
        const closed = lines.length === 1 && first[0] === lastLat && first[1] === lastLon;
        add(element.id, about, closed && (element.tags?.area === 'yes' || about.kind === 'snow_park'), lines);
    }
    for (const element of response.elements) {
        if (element.type !== 'relation') continue;
        const about = describe(element.tags);
        if (!about) continue;
        for (const member of element.members ?? []) {
            if (member.type === 'way') add(member.ref, about, false, toLines(member.geometry));
        }
    }
    return [...features.values()];
}

function boxOfFeature(feature: SkiMapFeature): Box {
    let south = Infinity, west = Infinity, north = -Infinity, east = -Infinity;
    for (const [lat, lon] of feature.coords) {
        south = Math.min(south, lat);
        north = Math.max(north, lat);
        west = Math.min(west, lon);
        east = Math.max(east, lon);
    }
    return { south, west, north, east };
}

/** Fetches squares from Overpass in one query, keeps each square's share, and returns everything it found. */
export async function fetchSquares(squares: Square[], signal: AbortSignal): Promise<SkiMapFeature[]> {
    const boxes = squares.map(squareBox);
    const area: Box = {
        south: Math.min(...boxes.map(b => b.south)),
        west: Math.min(...boxes.map(b => b.west)),
        north: Math.max(...boxes.map(b => b.north)),
        east: Math.max(...boxes.map(b => b.east)),
    };
    const features = toFeatures(await queryOverpass(overpassQuery(area), signal));
    const featureBoxes = features.map(boxOfFeature);
    const fetchedAt = Date.now();
    squares.forEach((square, i) => {
        // A feature crossing several squares is kept in each; the map draws it once
        const data: SquareData = { fetchedAt, features: features.filter((_, f) => overlaps(featureBoxes[f], boxes[i])) };
        remember(storageKey(square), data);
        idbSet(storageKey(square), data).catch(() => {
            // Storage unavailable: kept for this visit only
        });
    });
    return features;
}

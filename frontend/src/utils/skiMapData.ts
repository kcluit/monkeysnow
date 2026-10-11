/**
 * The Ski map's data: every Run and Lift around the map, built from OpenSkiData into static
 * files served with the site by `npm run import-ski-map` (docs/adr/0010). There is one file per
 * square, the map's zoom-12 tiles (about 10 km across at the equator, 7 km in the Alps), and a
 * square with nothing in it has none. Each square is kept in IndexedDB for a week.
 */

import { idbDeleteKeysStartingWith, idbGet, idbSet } from './indexedDB';

export type RunKind = 'downhill' | 'nordic' | 'skitour' | 'snow_park' | 'sled';

export interface SkiMapFeature {
    /** Named after its OpenStreetMap way or relation, e.g. "w123"; a feature drawn as several lines gets "w123#0" and so on */
    id: string;
    kind: RunKind | 'lift';
    name?: string;
    /** A Run's piste:difficulty, e.g. "intermediate" */
    difficulty?: string;
    /** A Lift's type, e.g. "chair_lift" or "funicular" */
    liftType?: string;
    /** Mapped as an area, such as a terrain park, rather than a line */
    area: boolean;
    /** [lat, lon] pairs */
    coords: [number, number][];
}

/** Below this zoom the Ski map draws nothing: a whole region's Runs make an unreadable map. */
export const SKI_MAP_MIN_ZOOM = 12;

const SQUARE_ZOOM = 12;
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;

export interface Square {
    x: number;
    y: number;
}

interface SquareData {
    fetchedAt: number;
    features: SkiMapFeature[];
}

const storageKey = (s: Square) => `skiMapSquare:${SQUARE_ZOOM}/${s.x}/${s.y}`;
const squareUrl = (s: Square) => `/skimap/${SQUARE_ZOOM}/${s.x}/${s.y}.json`;

// Squares fetched from Overpass before docs/adr/0010, dropped rather than mixed in
const OVERPASS_STORAGE_PREFIX = 'skimap:';
let overpassSquaresDropped = false;

// Squares read or fetched lately, so panning back doesn't go to IndexedDB again; a busy Alpine square is a few hundred KB
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

/**
 * What's known about some squares: the features of every one fetched before (stale ones
 * too, shown until they're refreshed), and which need fetching, in the order given.
 */
export async function readSquares(squares: Square[]): Promise<{ features: SkiMapFeature[]; needed: Square[] }> {
    if (!overpassSquaresDropped) {
        overpassSquaresDropped = true;
        idbDeleteKeysStartingWith(OVERPASS_STORAGE_PREFIX).catch(() => {
            // Storage unavailable: nothing kept to drop
        });
    }
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

/** A feature as a square's file holds it, which leaves out `area` unless it is true */
type StoredFeature = Omit<SkiMapFeature, 'area'> & { area?: true };

/** Fetches one square's Runs and Lifts and keeps them; a square with no file has none. */
export async function fetchSquare(square: Square, signal: AbortSignal): Promise<SkiMapFeature[]> {
    const response = await fetch(squareUrl(square), { signal });
    let features: SkiMapFeature[] = [];
    if (response.status !== 404) {
        if (!response.ok) throw new Error(`Ski map square answered ${response.status}`);
        // Vite's dev server answers a missing file with the app's page rather than a 404
        if (response.headers.get('content-type')?.includes('json')) {
            features = ((await response.json()) as StoredFeature[]).map(feature => ({ ...feature, area: feature.area === true }));
        }
    }
    const data: SquareData = { fetchedAt: Date.now(), features };
    remember(storageKey(square), data);
    idbSet(storageKey(square), data).catch(() => {
        // Storage unavailable: kept for this visit only
    });
    return features;
}

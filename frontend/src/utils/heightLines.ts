/**
 * Height lines: lines on the 3D map that follow the terrain at the heights being forecast.
 *
 * They are traced from Mapterhorn's terrain tiles, the ones the 3D map is drawn on, in a square
 * around the point being forecast, and fade out with distance from it, because the forecast is for
 * that one point (CONTEXT.md, docs/adr/0008).
 */

import type { FeatureCollection, LineString } from 'geojson';

/** Mapterhorn's open terrain: Terrarium-encoded heights in 512-pixel WebP tiles, with no key */
export const TERRAIN_TILE_URL = 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp';
export const TERRAIN_TILE_SIZE = 512;
export const TERRAIN_ATTRIBUTION = '<a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener noreferrer">&copy; Mapterhorn</a>';

/** Every point has tiles down to z12 (about 30 m data), so lines are traced at that zoom everywhere */
const TRACE_ZOOM = 12;
const WORLD_SIZE = TERRAIN_TILE_SIZE * 2 ** TRACE_ZOOM;
export const EARTH_CIRCUMFERENCE = 40075016.686;
export const METRES_PER_DEGREE = EARTH_CIRCUMFERENCE / 360;

/** A line is at full strength out to FADE_START metres from the point being forecast, and gone by FADE_END */
const FADE_START = 3000;
const FADE_END = 5000;
/** Lines are cut into pieces of this many steps, each faded by its own distance from the point */
const PIECE_STEPS = 8;
/** Keeps a line's label clear of the marker of the point it belongs to */
const LABEL_MIN_DISTANCE = 250;
/** A line is labelled only where it is still clearly drawn */
const LABEL_MIN_FADE = 0.4;

export interface HeightLine {
    /** Metres above sea level */
    elevation: number;
    /** e.g. "Base 1540m" */
    label: string;
    /** Whether the charts are for this height */
    bold: boolean;
}

export interface HeightLineProperties {
    bold: boolean;
    /** 1 near the point being forecast, falling to 0 at FADE_END */
    fade: number;
}

export interface HeightLineLabel {
    lat: number;
    lon: number;
    label: string;
    bold: boolean;
}

export interface TracedHeightLines {
    lines: FeatureCollection<LineString, HeightLineProperties>;
    labels: HeightLineLabel[];
}

export const NO_HEIGHT_LINES: TracedHeightLines = {
    lines: { type: 'FeatureCollection', features: [] },
    labels: [],
};

/** A tile's heights in metres, row by row, or null where Mapterhorn has no tile */
async function fetchTileHeights(x: number, y: number, signal: AbortSignal): Promise<Float32Array | null> {
    const url = TERRAIN_TILE_URL
        .replace('{z}', String(TRACE_ZOOM))
        .replace('{x}', String(x))
        .replace('{y}', String(y));
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    // Heights are packed into the colour channels, so the browser must not adjust the colours
    const bitmap = await createImageBitmap(await response.blob(), {
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none',
    });
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const heights = new Float32Array(canvas.width * canvas.height);
    for (let i = 0; i < heights.length; i++) {
        heights[i] = data[i * 4] * 256 + data[i * 4 + 1] + data[i * 4 + 2] / 256 - 32768;
    }
    return heights;
}

/** The heights in a square of pixels at TRACE_ZOOM, NaN where a tile is missing */
interface HeightGrid {
    /** Global pixel of the grid's first sample */
    x0: number;
    y0: number;
    width: number;
    height: number;
    values: Float32Array;
}

async function loadHeightGrid(x0: number, y0: number, size: number, signal: AbortSignal): Promise<HeightGrid> {
    const values = new Float32Array(size * size).fill(NaN);
    const firstTileX = Math.floor(x0 / TERRAIN_TILE_SIZE);
    const lastTileX = Math.floor((x0 + size - 1) / TERRAIN_TILE_SIZE);
    const firstTileY = Math.max(0, Math.floor(y0 / TERRAIN_TILE_SIZE));
    const lastTileY = Math.min(2 ** TRACE_ZOOM - 1, Math.floor((y0 + size - 1) / TERRAIN_TILE_SIZE));

    const loads: Promise<void>[] = [];
    for (let tileY = firstTileY; tileY <= lastTileY; tileY++) {
        for (let tileX = firstTileX; tileX <= lastTileX; tileX++) {
            loads.push(fetchTileHeights(tileX, tileY, signal).then((tile) => {
                if (!tile) return;
                // Copy the part of the tile that falls inside the grid
                const left = Math.max(x0, tileX * TERRAIN_TILE_SIZE);
                const right = Math.min(x0 + size, (tileX + 1) * TERRAIN_TILE_SIZE);
                const top = Math.max(y0, tileY * TERRAIN_TILE_SIZE);
                const bottom = Math.min(y0 + size, (tileY + 1) * TERRAIN_TILE_SIZE);
                for (let y = top; y < bottom; y++) {
                    const from = (y - tileY * TERRAIN_TILE_SIZE) * TERRAIN_TILE_SIZE - tileX * TERRAIN_TILE_SIZE;
                    values.set(tile.subarray(from + left, from + right), (y - y0) * size + (left - x0));
                }
            }));
        }
    }
    await Promise.all(loads);
    return smooth({ x0, y0, width: size, height: size, values });
}

/** Evens out single-pixel noise in the terrain, which would otherwise make every line zigzag */
function smooth(grid: HeightGrid): HeightGrid {
    const { width, height, values } = grid;
    const smoothed = new Float32Array(values.length);
    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            if (Number.isNaN(values[j * width + i])) {
                smoothed[j * width + i] = NaN;
                continue;
            }
            // A 3 by 3 blur weighted 1-2-1 each way, over whichever neighbours exist
            let sum = 0;
            let weight = 0;
            for (let dj = -1; dj <= 1; dj++) {
                for (let di = -1; di <= 1; di++) {
                    const x = i + di;
                    const y = j + dj;
                    if (x < 0 || y < 0 || x >= width || y >= height) continue;
                    const value = values[y * width + x];
                    if (Number.isNaN(value)) continue;
                    const w = (di === 0 ? 2 : 1) * (dj === 0 ? 2 : 1);
                    sum += value * w;
                    weight += w;
                }
            }
            smoothed[j * width + i] = sum / weight;
        }
    }
    return { ...grid, values: smoothed };
}

/**
 * Marching squares segments for each cell, as pairs of cell edges: 0 top, 1 right, 2 bottom, 3 left.
 * Indexed by which corners are at or above the height: top-left 8, top-right 4, bottom-right 2, bottom-left 1.
 * The two saddles (5 and 10) are resolved by the cell's average, below.
 */
const CELL_SEGMENTS: number[][] = [
    [], [3, 2], [2, 1], [3, 1], [0, 1], [], [0, 2], [3, 0],
    [3, 0], [0, 2], [], [0, 1], [3, 1], [1, 2], [3, 2], [],
];

/** The lines where the grid crosses one height, as runs of global pixel coordinates */
function traceHeight(grid: HeightGrid, height: number): [number, number][][] {
    const { width, values } = grid;
    // Each crossing sits on a cell edge, keyed so the two cells sharing an edge agree on it:
    // the top edge of cell (i, j) is 2 * (j * width + i), its left edge one more
    const edgeKey = (i: number, j: number, edge: number): number => {
        switch (edge) {
            case 0: return 2 * (j * width + i);
            case 1: return 2 * (j * width + i + 1) + 1;
            case 2: return 2 * ((j + 1) * width + i);
            default: return 2 * (j * width + i) + 1;
        }
    };
    const segmentStarts: number[] = [];
    const segmentEnds: number[] = [];
    for (let j = 0; j < grid.height - 1; j++) {
        for (let i = 0; i < width - 1; i++) {
            const a = values[j * width + i];
            const b = values[j * width + i + 1];
            const c = values[(j + 1) * width + i + 1];
            const d = values[(j + 1) * width + i];
            if (Number.isNaN(a + b + c + d)) continue;
            const corners = (a >= height ? 8 : 0) | (b >= height ? 4 : 0) | (c >= height ? 2 : 0) | (d >= height ? 1 : 0);
            let edges = CELL_SEGMENTS[corners];
            if (corners === 5 || corners === 10) {
                const centreAbove = (a + b + c + d) / 4 >= height;
                // Cut off the two corners that the centre does not join up
                edges = (corners === 5) === centreAbove ? [3, 0, 1, 2] : [0, 1, 3, 2];
            }
            for (let k = 0; k < edges.length; k += 2) {
                segmentStarts.push(edgeKey(i, j, edges[k]));
                segmentEnds.push(edgeKey(i, j, edges[k + 1]));
            }
        }
    }

    // Join the segments into lines through the edges they share
    const segmentsAtEdge = new Map<number, number[]>();
    const addToEdge = (key: number, segment: number): void => {
        const list = segmentsAtEdge.get(key);
        if (list) list.push(segment);
        else segmentsAtEdge.set(key, [segment]);
    };
    for (let s = 0; s < segmentStarts.length; s++) {
        addToEdge(segmentStarts[s], s);
        addToEdge(segmentEnds[s], s);
    }
    const used = new Uint8Array(segmentStarts.length);
    const follow = (from: number): number[] => {
        const keys: number[] = [];
        let key = from;
        for (;;) {
            const next = segmentsAtEdge.get(key)?.find((s) => !used[s]);
            if (next === undefined) return keys;
            used[next] = 1;
            key = segmentStarts[next] === key ? segmentEnds[next] : segmentStarts[next];
            keys.push(key);
        }
    };

    // Where along its edge the grid crosses the height, in global pixels (samples sit at pixel centres)
    const crossing = (key: number): [number, number] => {
        const cell = key >> 1;
        const i = cell % width;
        const j = Math.floor(cell / width);
        const vertical = (key & 1) === 1;
        const from = values[cell];
        const to = values[vertical ? cell + width : cell + 1];
        const t = (height - from) / (to - from);
        return [
            grid.x0 + i + 0.5 + (vertical ? 0 : t),
            grid.y0 + j + 0.5 + (vertical ? t : 0),
        ];
    };

    const lines: [number, number][][] = [];
    for (let s = 0; s < segmentStarts.length; s++) {
        if (used[s]) continue;
        used[s] = 1;
        const forward = follow(segmentEnds[s]);
        const backward = follow(segmentStarts[s]);
        const keys = [...backward.reverse(), segmentStarts[s], segmentEnds[s], ...forward];
        lines.push(keys.map(crossing));
    }
    return lines;
}

const pixelToLon = (x: number): number => (x / WORLD_SIZE) * 360 - 180;
const pixelToLat = (y: number): number =>
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / WORLD_SIZE))) * 180) / Math.PI;

/**
 * Traces the given heights around a point, fading each line out with distance from it,
 * and picks a spot near the point to label each line.
 */
export async function traceHeightLines(
    point: { lat: number; lon: number },
    heightLines: readonly HeightLine[],
    signal: AbortSignal
): Promise<TracedHeightLines> {
    if (heightLines.length === 0) return NO_HEIGHT_LINES;

    const latRadians = (point.lat * Math.PI) / 180;
    const centreX = ((point.lon + 180) / 360) * WORLD_SIZE;
    const centreY = ((1 - Math.log(Math.tan(Math.PI / 4 + latRadians / 2)) / Math.PI) / 2) * WORLD_SIZE;
    const metresPerPixel = (EARTH_CIRCUMFERENCE * Math.cos(latRadians)) / WORLD_SIZE;
    const radius = Math.ceil(FADE_END / metresPerPixel);
    const grid = await loadHeightGrid(Math.floor(centreX) - radius, Math.floor(centreY) - radius, 2 * radius + 1, signal);

    const metresPerLonDegree = METRES_PER_DEGREE * Math.cos(latRadians);
    const distanceTo = (lon: number, lat: number): number =>
        Math.hypot((lon - point.lon) * metresPerLonDegree, (lat - point.lat) * METRES_PER_DEGREE);
    const fadeAt = (distance: number): number =>
        distance <= FADE_START ? 1 : Math.max(0, 1 - (distance - FADE_START) / (FADE_END - FADE_START));

    const traced: TracedHeightLines = { lines: { type: 'FeatureCollection', features: [] }, labels: [] };
    for (const heightLine of heightLines) {
        let labelAt: { lon: number; lat: number; distance: number } | null = null;
        for (const pixels of traceHeight(grid, heightLine.elevation)) {
            const coordinates = pixels.map(([x, y]): [number, number] => [pixelToLon(x), pixelToLat(y)]);
            for (let start = 0; start < coordinates.length - 1; start += PIECE_STEPS) {
                const piece = coordinates.slice(start, start + PIECE_STEPS + 1);
                const [midLon, midLat] = piece[Math.floor(piece.length / 2)];
                const fade = Math.round(fadeAt(distanceTo(midLon, midLat)) * 100) / 100;
                if (fade === 0) continue;
                traced.lines.features.push({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: piece },
                    properties: { bold: heightLine.bold, fade },
                });
            }
            for (const [lon, lat] of coordinates) {
                const distance = distanceTo(lon, lat);
                if (distance >= LABEL_MIN_DISTANCE && fadeAt(distance) >= LABEL_MIN_FADE && (!labelAt || distance < labelAt.distance)) {
                    labelAt = { lon, lat, distance };
                }
            }
        }
        if (labelAt) {
            traced.labels.push({ lat: labelAt.lat, lon: labelAt.lon, label: heightLine.label, bold: heightLine.bold });
        }
    }
    return traced;
}

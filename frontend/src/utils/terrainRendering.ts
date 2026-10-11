/**
 * Draws the hillshade, slope angle and contour Overlays onto one map tile's canvas
 * from the heights under it (utils/terrainTiles.ts). Each needs a two-sample border
 * of heights around the tile, so neighbouring tiles join without seams.
 */

import type { ElevationWindow } from './terrainTiles';
import type { UnitSystem } from './unitConversion';

/** The border every renderer here needs around a tile: one sample for slopes, one more for smoothing. */
export const TERRAIN_BORDER = 2;

export const CONTOURS_MIN_ZOOM = 10;
// Further out, a pixel spans more ground than the terrain data resolves and every slope reads shallower than it is
export const SLOPE_ANGLE_MIN_ZOOM = 12;

const FEET_TO_METRES = 0.3048;

/**
 * Per-sample slopes in the east and south directions (Horn's method), on a grid one sample
 * smaller each side than the window: index (i, j) is window sample (i + 1, j + 1).
 */
function gradients(w: ElevationWindow): { east: Float32Array; south: Float32Array; size: number } {
    const S = w.size;
    const G = S - 2;
    const h = w.heights;
    const east = new Float32Array(G * G);
    const south = new Float32Array(G * G);
    const scale = 8 * w.metresPerSample;
    for (let j = 0; j < G; j++) {
        const above = j * S;
        const row = above + S;
        const below = row + S;
        for (let i = 0; i < G; i++) {
            const a = h[above + i], b = h[above + i + 1], c = h[above + i + 2];
            const d = h[row + i], f = h[row + i + 2];
            const g = h[below + i], k = h[below + i + 1], l = h[below + i + 2];
            east[j * G + i] = ((c + 2 * f + l) - (a + 2 * d + g)) / scale;
            south[j * G + i] = ((g + 2 * k + l) - (a + 2 * b + c)) / scale;
        }
    }
    return { east, south, size: G };
}

/**
 * Where each canvas pixel along one axis falls on a grid that starts one sample before the
 * tile edge: the grid index before it and how far it is towards the next.
 */
function pixelSamples(pixels: number, n: number, gridSize: number): { index: Int32Array; weight: Float32Array } {
    const index = new Int32Array(pixels);
    const weight = new Float32Array(pixels);
    for (let p = 0; p < pixels; p++) {
        const u = ((p + 0.5) * n) / pixels - 0.5 + 1;
        const i = Math.min(gridSize - 2, Math.max(0, Math.floor(u)));
        index[p] = i;
        weight[p] = Math.min(1, Math.max(0, u - i));
    }
    return { index, weight };
}

/** Paints every pixel of the canvas from a per-sample value, smoothly interpolated between samples. */
function paintPixels(
    canvas: HTMLCanvasElement,
    values: Float32Array,
    gridSize: number,
    n: number,
    colour: (value: number, rgba: Uint8ClampedArray, offset: number) => void,
): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    const image = ctx.createImageData(width, height);
    const cols = pixelSamples(width, n, gridSize);
    const rows = pixelSamples(height, n, gridSize);
    for (let py = 0; py < height; py++) {
        const top = rows.index[py] * gridSize;
        const bottom = top + gridSize;
        const fy = rows.weight[py];
        for (let px = 0; px < width; px++) {
            const i = cols.index[px];
            const fx = cols.weight[px];
            const upper = values[top + i] + (values[top + i + 1] - values[top + i]) * fx;
            const lower = values[bottom + i] + (values[bottom + i + 1] - values[bottom + i]) * fx;
            colour(upper + (lower - upper) * fy, image.data, (py * width + px) * 4);
        }
    }
    ctx.putImageData(image, 0, 0);
}

// Lit from the north-west, 45 degrees up, as maps conventionally are; flat ground gets this much light
const FLAT_LIGHT = Math.SQRT1_2;

/** Shaded relief: slopes facing away from the light darken, slopes facing it lighten. */
export function renderHillshade(canvas: HTMLCanvasElement, w: ElevationWindow): void {
    const { east, south, size } = gradients(w);
    const light = new Float32Array(size * size);
    for (let i = 0; i < light.length; i++) {
        // Surface normal (-east, south, 1) against the light (-0.5, 0.5, 0.707), both with north as +y
        light[i] = (0.5 * east[i] + 0.5 * south[i] + FLAT_LIGHT) / Math.sqrt(east[i] ** 2 + south[i] ** 2 + 1);
    }
    paintPixels(canvas, light, size, w.n, (value, rgba, o) => {
        const shade = value - FLAT_LIGHT;
        if (shade < 0) {
            rgba[o + 3] = Math.min(0.55, -shade * 1.4) * 255;
        } else {
            rgba[o] = rgba[o + 1] = rgba[o + 2] = 255;
            rgba[o + 3] = Math.min(0.3, shade * 0.9) * 255;
        }
    });
}

/** Steepness bands from 30 degrees, where avalanche courses say slab avalanches start, in swisstopo's colours. */
export const SLOPE_ANGLE_BANDS: readonly { from: number; colour: [number, number, number] }[] = [
    { from: 45, colour: [148, 51, 197] },
    { from: 40, colour: [229, 30, 37] },
    { from: 35, colour: [255, 140, 0] },
    { from: 30, colour: [255, 221, 0] },
];

export function renderSlopeAngle(canvas: HTMLCanvasElement, w: ElevationWindow): void {
    const { east, south, size } = gradients(w);
    const degrees = new Float32Array(size * size);
    for (let i = 0; i < degrees.length; i++) {
        degrees[i] = (Math.atan(Math.hypot(east[i], south[i])) * 180) / Math.PI;
    }
    // Banding after interpolating keeps the bands' edges crisp when zoomed past the terrain data
    paintPixels(canvas, degrees, size, w.n, (value, rgba, o) => {
        const band = SLOPE_ANGLE_BANDS.find(b => value >= b.from);
        if (!band) return;
        rgba[o] = band.colour[0];
        rgba[o + 1] = band.colour[1];
        rgba[o + 2] = band.colour[2];
        rgba[o + 3] = 130;
    });
}

/** The gap between contour lines in the visitor's units: round numbers that thin out as the map zooms out. */
export function contourStep(zoom: number, unitSystem: UnitSystem): number {
    if (unitSystem === 'imperial') return zoom >= 14 ? 40 : zoom === 13 ? 100 : zoom === 12 ? 200 : 500;
    return zoom >= 14 ? 20 : zoom === 13 ? 50 : zoom === 12 ? 100 : 200;
}

// Every fifth line is drawn thicker and labelled with its height
const INDEX_EVERY = 5;

export interface ContourStyle {
    line: string;
    indexLine: string;
    label: string;
    halo: string;
}

export function renderContours(
    canvas: HTMLCanvasElement,
    w: ElevationWindow,
    zoom: number,
    unitSystem: UnitSystem,
    style: ContourStyle,
): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Box-blur the heights once, so lines don't trace every bump in the terrain data
    const S = w.size;
    const G = S - 2;
    const h = w.heights;
    const smooth = new Float32Array(G * G);
    for (let j = 0; j < G; j++) {
        for (let i = 0; i < G; i++) {
            let sum = 0;
            for (let dj = 0; dj < 3; dj++) {
                const row = (j + dj) * S + i;
                sum += h[row] + h[row + 1] + h[row + 2];
            }
            smooth[j * G + i] = sum / 9;
        }
    }

    const step = contourStep(zoom, unitSystem);
    const stepMetres = unitSystem === 'imperial' ? step * FEET_TO_METRES : step;
    const ratio = canvas.width / 256;
    // Grid sample i sits at the middle of tile sample i - 1
    const cell = canvas.width / w.n;
    const position = (i: number) => (i - 0.5) * cell;

    const lines = new Path2D();
    const indexLines = new Path2D();
    // At most one label in each quarter of the tile, the one nearest the quarter's middle
    const quarter = canvas.width / 2;
    const labels: ({ x: number; y: number; angle: number; text: string; distance: number } | null)[] = [null, null, null, null];
    const margin = 24 * ratio;

    for (let j = 0; j < G - 1; j++) {
        const y0 = position(j);
        const y1 = y0 + cell;
        for (let i = 0; i < G - 1; i++) {
            const tl = smooth[j * G + i];
            const tr = smooth[j * G + i + 1];
            const bl = smooth[(j + 1) * G + i];
            const br = smooth[(j + 1) * G + i + 1];
            const min = Math.min(tl, tr, bl, br);
            const max = Math.max(tl, tr, bl, br);
            const first = Math.ceil(min / stepMetres);
            const last = Math.floor(max / stepMetres);
            if (first > last) continue;

            const x0 = position(i);
            const x1 = x0 + cell;
            for (let k = first; k <= last; k++) {
                const level = k * stepMetres;
                const isIndex = k % INDEX_EVERY === 0;
                const path = isIndex ? indexLines : lines;
                const top = (): [number, number] => [x0 + ((level - tl) / (tr - tl)) * cell, y0];
                const right = (): [number, number] => [x1, y0 + ((level - tr) / (br - tr)) * cell];
                const bottom = (): [number, number] => [x0 + ((level - bl) / (br - bl)) * cell, y1];
                const left = (): [number, number] => [x0, y0 + ((level - tl) / (bl - tl)) * cell];
                const segment = (a: [number, number], b: [number, number]) => {
                    path.moveTo(a[0], a[1]);
                    path.lineTo(b[0], b[1]);
                };

                // Marching squares: which corners are at or above the level
                const corners = (tl >= level ? 8 : 0) | (tr >= level ? 4 : 0) | (br >= level ? 2 : 0) | (bl >= level ? 1 : 0);
                const middleAbove = (tl + tr + bl + br) / 4 >= level;
                switch (corners) {
                    case 1: case 14: segment(left(), bottom()); break;
                    case 2: case 13: segment(bottom(), right()); break;
                    case 3: case 12: segment(left(), right()); break;
                    case 4: case 11: segment(top(), right()); break;
                    case 6: case 9: segment(top(), bottom()); break;
                    case 7: case 8: segment(left(), top()); break;
                    case 5:
                        if (middleAbove) { segment(left(), top()); segment(bottom(), right()); }
                        else { segment(top(), right()); segment(left(), bottom()); }
                        break;
                    case 10:
                        if (middleAbove) { segment(top(), right()); segment(left(), bottom()); }
                        else { segment(left(), top()); segment(bottom(), right()); }
                        break;
                    default: continue;
                }

                if (!isIndex) continue;
                const x = x0 + cell / 2;
                const y = y0 + cell / 2;
                if (x < margin || y < margin || x > canvas.width - margin || y > canvas.height - margin) continue;
                const slot = (y < quarter ? 0 : 2) + (x < quarter ? 0 : 1);
                const distance = Math.hypot(x - ((slot % 2) + 0.5) * quarter, y - (Math.floor(slot / 2) + 0.5) * quarter);
                const current = labels[slot];
                if (current && current.distance <= distance) continue;
                // A contour runs across the slope, at right angles to the way it falls
                let angle = Math.atan2((bl + br - tl - tr) / 2, (tr + br - tl - bl) / 2) + Math.PI / 2;
                if (angle > Math.PI / 2) angle -= Math.PI;
                if (angle < -Math.PI / 2) angle += Math.PI;
                labels[slot] = { x, y, angle, text: String(k * step), distance };
            }
        }
    }

    ctx.lineCap = 'round';
    ctx.strokeStyle = style.line;
    ctx.lineWidth = ratio;
    ctx.stroke(lines);
    ctx.strokeStyle = style.indexLine;
    ctx.lineWidth = 1.6 * ratio;
    ctx.stroke(indexLines);

    ctx.font = `600 ${10 * ratio}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3 * ratio;
    for (const label of labels) {
        if (!label) continue;
        ctx.save();
        ctx.translate(label.x, label.y);
        ctx.rotate(label.angle);
        ctx.strokeStyle = style.halo;
        ctx.strokeText(label.text, 0, 0);
        ctx.fillStyle = style.label;
        ctx.fillText(label.text, 0, 0);
        ctx.restore();
    }
}

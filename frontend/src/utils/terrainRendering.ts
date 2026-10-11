/**
 * Draws the terrain Overlays (hillshade, contours, Flats and the Terrain colourings) onto one
 * map tile's canvas from the heights under it (utils/terrainTiles.ts), for both maps. Each needs
 * a two-sample border of heights around the tile, so neighbouring tiles join without seams.
 */

import type { SlopeBand } from './slopeBands';
import type { ElevationWindow } from './terrainTiles';
import type { UnitSystem } from './unitConversion';

/** The border every renderer here needs around a tile: one sample for slopes, one more for smoothing. */
export const TERRAIN_BORDER = 2;

export const CONTOURS_MIN_ZOOM = 10;
// Further out, a sample spans more ground than 30 m terrain, and every slope reads shallower than it is (docs/adr/0009)
export const STEEPNESS_MIN_ZOOM = 12;

/** Ground under this many degrees is a Flat and has no Aspect */
export const FLAT_BELOW_DEGREES = 5;

const FEET_TO_METRES = 0.3048;

type Rgb = readonly [number, number, number];

/** A colour scale: colours at values, blended in between */
export interface ColourStop {
    value: number;
    colour: Rgb;
}

function colourAt(stops: readonly ColourStop[], value: number): Rgb {
    if (value <= stops[0].value) return stops[0].colour;
    for (let i = 1; i < stops.length; i++) {
        if (value <= stops[i].value) {
            const a = stops[i - 1];
            const b = stops[i];
            const t = (value - a.value) / (b.value - a.value);
            return [0, 1, 2].map(c => Math.round(a.colour[c] + (b.colour[c] - a.colour[c]) * t)) as unknown as Rgb;
        }
    }
    return stops[stops.length - 1].colour;
}

/** A scale's colours at every `step` from its first value to its last, so each pixel only looks one up */
function colourTable(stops: readonly ColourStop[], step: number): Uint8Array {
    const first = stops[0].value;
    const count = Math.round((stops[stops.length - 1].value - first) / step) + 1;
    const table = new Uint8Array(count * 3);
    for (let i = 0; i < count; i++) table.set(colourAt(stops, first + i * step), i * 3);
    return table;
}

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

/**
 * Paints every pixel of the canvas from one or two per-sample values, each smoothly interpolated
 * between samples; `colour` leaves a pixel clear by not touching it.
 */
function paintPixels(
    canvas: HTMLCanvasElement,
    grids: readonly [Float32Array] | readonly [Float32Array, Float32Array],
    gridSize: number,
    n: number,
    colour: (a: number, b: number, rgba: Uint8ClampedArray, offset: number) => void,
): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    const image = ctx.createImageData(width, height);
    const cols = pixelSamples(width, n, gridSize);
    const rows = pixelSamples(height, n, gridSize);
    const [first, second] = grids;
    const at = (values: Float32Array, top: number, bottom: number, i: number, fx: number, fy: number) => {
        const upper = values[top + i] + (values[top + i + 1] - values[top + i]) * fx;
        const lower = values[bottom + i] + (values[bottom + i + 1] - values[bottom + i]) * fx;
        return upper + (lower - upper) * fy;
    };
    for (let py = 0; py < height; py++) {
        const top = rows.index[py] * gridSize;
        const bottom = top + gridSize;
        const fy = rows.weight[py];
        for (let px = 0; px < width; px++) {
            const i = cols.index[px];
            const fx = cols.weight[px];
            const a = at(first, top, bottom, i, fx, fy);
            const b = second ? at(second, top, bottom, i, fx, fy) : 0;
            colour(a, b, image.data, (py * width + px) * 4);
        }
    }
    ctx.putImageData(image, 0, 0);
}

function setPixel(rgba: Uint8ClampedArray, offset: number, colour: Rgb | Uint8Array, alpha: number, from = 0): void {
    rgba[offset] = colour[from];
    rgba[offset + 1] = colour[from + 1];
    rgba[offset + 2] = colour[from + 2];
    rgba[offset + 3] = alpha;
}

/** Each sample's steepness in degrees, on the same grid as gradients() */
function steepness(east: Float32Array, south: Float32Array): Float32Array {
    const degrees = new Float32Array(east.length);
    for (let i = 0; i < degrees.length; i++) {
        degrees[i] = (Math.atan(Math.hypot(east[i], south[i])) * 180) / Math.PI;
    }
    return degrees;
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
    paintPixels(canvas, [light], size, w.n, (value, _, rgba, o) => {
        const shade = value - FLAT_LIGHT;
        if (shade < 0) {
            rgba[o + 3] = Math.min(0.55, -shade * 1.4) * 255;
        } else {
            rgba[o] = rgba[o + 1] = rgba[o + 2] = 255;
            rgba[o + 3] = Math.min(0.3, shade * 0.9) * 255;
        }
    });
}

const rgbOf = (hex: string): Rgb => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;

/** Ground in one of the visitor's Slope bands in that band's colour; the rest is left clear. */
export function renderSlopeAngle(canvas: HTMLCanvasElement, w: ElevationWindow, bands: readonly SlopeBand[]): void {
    // Bands start and end on whole degrees, so a pixel's band is the one its degrees rounded down fall in
    const byDegree: (Rgb | undefined)[] = [];
    for (const band of bands) {
        const colour = rgbOf(band.colour);
        for (let degree = band.from; degree < band.to; degree++) byDegree[degree] = colour;
    }
    const { east, south, size } = gradients(w);
    // Banding after interpolating keeps the bands' edges crisp when zoomed past the terrain data
    paintPixels(canvas, [steepness(east, south)], size, w.n, (degrees, _, rgba, o) => {
        const colour = byDegree[Math.floor(degrees)];
        if (colour) setPixel(rgba, o, colour, 130);
    });
}

/** Skimomap's steepness scale: teal on the flat, through green, yellow, orange and red, to purple on cliffs */
export const GRADIENT_STOPS: readonly ColourStop[] = [
    { value: 0, colour: [111, 220, 197] },
    { value: 5, colour: [111, 226, 149] },
    { value: 15, colour: [165, 224, 101] },
    { value: 25, colour: [255, 255, 178] },
    { value: 30, colour: [254, 204, 92] },
    { value: 35, colour: [253, 141, 60] },
    { value: 40, colour: [240, 59, 30] },
    { value: 55, colour: [189, 0, 60] },
    { value: 65, colour: [138, 1, 90] },
    { value: 75, colour: [116, 1, 143] },
    { value: 90, colour: [63, 2, 128] },
];
// A tenth of a degree is finer than the eye can tell apart on the scale
const GRADIENT_STEP = 0.1;
let gradientTable: Uint8Array | null = null;

export function renderGradient(canvas: HTMLCanvasElement, w: ElevationWindow): void {
    gradientTable ??= colourTable(GRADIENT_STOPS, GRADIENT_STEP);
    const table = gradientTable;
    const { east, south, size } = gradients(w);
    paintPixels(canvas, [steepness(east, south)], size, w.n, (degrees, _, rgba, o) => {
        setPixel(rgba, o, table, 140, Math.round(Math.min(90, Math.max(0, degrees)) / GRADIENT_STEP) * 3);
    });
}

export const FLATS_COLOUR: Rgb = [50, 229, 147];

export function renderFlats(canvas: HTMLCanvasElement, w: ElevationWindow): void {
    const { east, south, size } = gradients(w);
    paintPixels(canvas, [steepness(east, south)], size, w.n, (degrees, _, rgba, o) => {
        if (degrees < FLAT_BELOW_DEGREES) setPixel(rgba, o, FLATS_COLOUR, 170);
    });
}

/** The eight Aspects clockwise from north, each 45 degrees wide, in skimomap's colours: cold blues north, warm oranges south */
export const ASPECT_SECTORS: readonly { name: string; colour: Rgb }[] = [
    { name: 'N', colour: [2, 119, 255] },
    { name: 'NE', colour: [140, 193, 255] },
    { name: 'E', colour: [255, 255, 255] },
    { name: 'SE', colour: [255, 182, 141] },
    { name: 'S', colour: [255, 94, 0] },
    { name: 'SW', colour: [115, 42, 1] },
    { name: 'W', colour: [0, 0, 0] },
    { name: 'NW', colour: [0, 54, 115] },
];

const FLAT_GRADIENT = Math.tan((FLAT_BELOW_DEGREES * Math.PI) / 180);

/**
 * Which of ASPECT_SECTORS a slope faces, from how fast the ground rises to the east and to the south,
 * or null on a Flat, which has no Aspect.
 */
export function aspectSector(east: number, south: number): number | null {
    if (Math.hypot(east, south) < FLAT_GRADIENT) return null;
    // A slope faces downhill: west where the ground rises to the east, north where it rises to the south
    const bearing = (Math.atan2(-east, south) * 180) / Math.PI;
    return Math.floor((((bearing + 22.5) % 360) + 360) % 360 / 45) % 8;
}

export function renderAspect(canvas: HTMLCanvasElement, w: ElevationWindow): void {
    const { east, south, size } = gradients(w);
    // The slope's two directions are interpolated rather than its compass bearing, which jumps from 359 to 0 degrees
    paintPixels(canvas, [east, south], size, w.n, (e, s, rgba, o) => {
        const sector = aspectSector(e, s);
        if (sector !== null) setPixel(rgba, o, ASPECT_SECTORS[sector].colour, 150);
    });
}

/** Skimomap's height scale in metres: pale green at sea level, a step every 500 m through teal and blue to purple */
export const HEIGHT_TINT_STOPS: readonly ColourStop[] = [
    { value: 0, colour: [220, 241, 170] },
    { value: 500, colour: [189, 228, 140] },
    { value: 1000, colour: [145, 217, 132] },
    { value: 1500, colour: [102, 204, 153] },
    { value: 2000, colour: [92, 191, 185] },
    { value: 2500, colour: [75, 166, 186] },
    { value: 3000, colour: [71, 134, 179] },
    { value: 3500, colour: [66, 98, 166] },
    { value: 4000, colour: [54, 70, 153] },
    { value: 4500, colour: [59, 52, 140] },
    { value: 5000, colour: [66, 40, 117] },
    { value: 6000, colour: [76, 29, 98] },
    { value: 7000, colour: [80, 16, 75] },
    { value: 8000, colour: [56, 6, 44] },
];
const HEIGHT_TINT_STEP = 1;
let heightTintTable: Uint8Array | null = null;

export function renderHeightTint(canvas: HTMLCanvasElement, w: ElevationWindow): void {
    heightTintTable ??= colourTable(HEIGHT_TINT_STOPS, HEIGHT_TINT_STEP);
    const table = heightTintTable;
    // The heights on the same grid as gradients(), one sample in from the window's edge
    const S = w.size;
    const G = S - 2;
    const heights = new Float32Array(G * G);
    for (let j = 0; j < G; j++) heights.set(w.heights.subarray((j + 1) * S + 1, (j + 1) * S + 1 + G), j * G);
    const last = HEIGHT_TINT_STOPS[HEIGHT_TINT_STOPS.length - 1].value;
    paintPixels(canvas, [heights], G, w.n, (metres, _, rgba, o) => {
        // The sea, and the zero Mapterhorn gives it, stay clear
        if (metres <= 0) return;
        setPixel(rgba, o, table, 140, Math.round(Math.min(last, metres) / HEIGHT_TINT_STEP) * 3);
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

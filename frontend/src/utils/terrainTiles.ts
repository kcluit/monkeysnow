/**
 * Ground heights for the terrain Overlays on both maps and for Height lines, from Mapterhorn's
 * open terrain: keyless, served with open CORS so the browser can read their pixels
 * (docs/adr/0008, docs/adr/0009). Each 512 px WebP tile encodes a height per pixel in its colour.
 */

/** Terrarium-encoded heights in 512-pixel WebP tiles, with no key */
export const TERRAIN_TILE_URL = 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp';
export const TERRAIN_TILE_SIZE = 512;
export const TERRAIN_ATTRIBUTION = '<a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener noreferrer">&copy; Mapterhorn</a>';

/** Every point has tiles down to this zoom, about 30 m data; only some countries have sharper ones */
export const TERRAIN_BASE_ZOOM = 12;
// About 10 m (7 m in the Alps): finer picks out rock steps rather than slopes a slab could run on (docs/adr/0009)
export const OVERLAY_MAX_ZOOM = 13;
const EARTH_CIRCUMFERENCE_M = 40075016.686;

// About 32 MB of heights: a fullscreen flat map's worth of tiles plus their neighbours
const CACHE_LIMIT = 32;
const cache = new Map<string, Promise<Float32Array | null>>();

const tileUrl = (z: number, x: number, y: number) =>
    TERRAIN_TILE_URL.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));

/** A tile's heights in metres, row by row; 'missing' where Mapterhorn has no tile, null if it couldn't be fetched */
async function fetchDemTile(z: number, x: number, y: number): Promise<Float32Array | 'missing' | null> {
    try {
        const response = await fetch(tileUrl(z, x, y));
        if (response.status === 404) return 'missing';
        if (!response.ok) return null;
        // No colour management or alpha handling, which would change the encoded heights
        const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
        const canvas = document.createElement('canvas');
        canvas.width = TERRAIN_TILE_SIZE;
        canvas.height = TERRAIN_TILE_SIZE;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0, TERRAIN_TILE_SIZE, TERRAIN_TILE_SIZE);
        bitmap.close();
        const { data } = ctx.getImageData(0, 0, TERRAIN_TILE_SIZE, TERRAIN_TILE_SIZE);
        const heights = new Float32Array(TERRAIN_TILE_SIZE * TERRAIN_TILE_SIZE);
        for (let i = 0; i < heights.length; i++) {
            heights[i] = data[i * 4] * 256 + data[i * 4 + 1] + data[i * 4 + 2] / 256 - 32768;
        }
        return heights;
    } catch {
        return null;
    }
}

/** The quarter of a tile that its child x/y covers, stretched to a whole tile */
function childOf(parent: Float32Array, x: number, y: number): Float32Array {
    const S = TERRAIN_TILE_SIZE;
    // Where each child sample falls in the parent along one axis: the parent sample before it and how far on
    const samples = (offset: number) => {
        const index = new Int32Array(S);
        const weight = new Float32Array(S);
        for (let p = 0; p < S; p++) {
            const u = Math.min(S - 1, Math.max(0, offset + (p + 0.5) / 2 - 0.5));
            index[p] = Math.min(S - 2, Math.floor(u));
            weight[p] = u - index[p];
        }
        return { index, weight };
    };
    const columns = samples((x % 2) * (S / 2));
    const rows = samples((y % 2) * (S / 2));
    const child = new Float32Array(S * S);
    for (let j = 0; j < S; j++) {
        const above = rows.index[j] * S;
        const below = above + S;
        const fy = rows.weight[j];
        for (let i = 0; i < S; i++) {
            const c = columns.index[i];
            const fx = columns.weight[i];
            const top = parent[above + c] + (parent[above + c + 1] - parent[above + c]) * fx;
            const bottom = parent[below + c] + (parent[below + c + 1] - parent[below + c]) * fx;
            child[j * S + i] = top + (bottom - top) * fy;
        }
    }
    return child;
}

/**
 * The heights of tile z/x/y, or null if they couldn't be fetched or Mapterhorn has none there.
 * Above the zoom it has everywhere, a missing tile is the coarser tile stretched, as the 3D terrain does.
 */
export function loadDemTile(z: number, x: number, y: number): Promise<Float32Array | null> {
    const key = `${z}/${x}/${y}`;
    let tile = cache.get(key);
    if (tile) {
        // Most recently used goes last, so the oldest is first out
        cache.delete(key);
    } else {
        tile = fetchDemTile(z, x, y).then(async fetched => {
            let heights = fetched === 'missing' ? null : fetched;
            if (fetched === 'missing' && z > TERRAIN_BASE_ZOOM) {
                const parent = await loadDemTile(z - 1, x >> 1, y >> 1);
                heights = parent && childOf(parent, x, y);
            }
            // Don't remember a failure: the next tile drawn here tries again
            if (!heights) cache.delete(key);
            return heights;
        });
    }
    cache.set(key, tile);
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    return tile;
}

/** Heights covering one 256 px map tile, plus a border of extra samples around it. */
export interface ElevationWindow {
    /** size x size heights in metres, in rows from north to south */
    heights: Float32Array;
    size: number;
    /** Samples across the map tile itself, not counting the border: 512 up to zoom 13, then 256, 128... */
    n: number;
    border: number;
    /** Ground distance between neighbouring samples */
    metresPerSample: number;
}

/** The heights under map tile z/x/y, with `border` samples beyond each edge, or null if any terrain tile failed. */
export async function elevationWindow(z: number, x: number, y: number, border: number): Promise<ElevationWindow | null> {
    const demZ = Math.min(z, OVERLAY_MAX_ZOOM);
    // A 512 px terrain tile covers the same ground as a 256 px map tile at the same zoom
    const n = TERRAIN_TILE_SIZE / 2 ** (z - demZ);
    const size = n + 2 * border;
    const tilesAcross = 2 ** demZ;
    const worldSize = tilesAcross * TERRAIN_TILE_SIZE;
    // In samples across the whole world at demZ
    const left = x * n - border;
    const top = y * n - border;

    const wrapX = (gx: number) => ((gx % worldSize) + worldSize) % worldSize;
    const clampY = (gy: number) => Math.min(worldSize - 1, Math.max(0, gy));

    const needed = new Map<string, Promise<Float32Array | null>>();
    const lastRow = Math.floor(clampY(top + size - 1) / TERRAIN_TILE_SIZE);
    const lastColumn = Math.floor((left + size - 1) / TERRAIN_TILE_SIZE);
    for (let ty = Math.floor(clampY(top) / TERRAIN_TILE_SIZE); ty <= lastRow; ty++) {
        for (let column = Math.floor(left / TERRAIN_TILE_SIZE); column <= lastColumn; column++) {
            const tx = ((column % tilesAcross) + tilesAcross) % tilesAcross;
            needed.set(`${tx}/${ty}`, loadDemTile(demZ, tx, ty));
        }
    }
    const loaded = new Map<string, Float32Array>();
    for (const [key, promise] of needed) {
        const heights = await promise;
        if (!heights) return null;
        loaded.set(key, heights);
    }

    // The window's columns in stretches that each lie within one terrain tile, so every row is copied a stretch at a time
    const stretches: { from: number; tx: number; offset: number; length: number }[] = [];
    for (let i = 0; i < size; ) {
        const gx = wrapX(left + i);
        const offset = gx % TERRAIN_TILE_SIZE;
        const length = Math.min(TERRAIN_TILE_SIZE - offset, size - i);
        stretches.push({ from: i, tx: Math.floor(gx / TERRAIN_TILE_SIZE), offset, length });
        i += length;
    }

    const heights = new Float32Array(size * size);
    for (let j = 0; j < size; j++) {
        const gy = clampY(top + j);
        const ty = Math.floor(gy / TERRAIN_TILE_SIZE);
        const row = (gy % TERRAIN_TILE_SIZE) * TERRAIN_TILE_SIZE;
        for (const { from, tx, offset, length } of stretches) {
            heights.set(loaded.get(`${tx}/${ty}`)!.subarray(row + offset, row + offset + length), j * size + from);
        }
    }

    // Web Mercator stretches distances by 1/cos(latitude); measured at the tile's middle
    const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 0.5)) / 2 ** z)));
    const metresPerSample = (EARTH_CIRCUMFERENCE_M * Math.cos(lat)) / worldSize;

    return { heights, size, n, border, metresPerSample };
}

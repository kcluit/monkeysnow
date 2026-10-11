/**
 * Ground heights for the contour, hillshade and slope angle Overlays, from AWS Terrain
 * Tiles: keyless, served with open CORS so the browser can read their pixels
 * (docs/adr/0007). Each 256 px PNG encodes a height per pixel in its colour, up to
 * zoom 15; closer in, the zoom-15 tile is stretched.
 */

const terrainUrl = (z: number, x: number, y: number) =>
    `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

// The link lists every source the heights come from (SRTM, 3DEP, EU-DEM and others)
export const TERRAIN_ATTRIBUTION =
    'Terrain: <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Mapzen</a>';

const TERRAIN_MAX_ZOOM = 15;
const DEM_SIZE = 256;
const EARTH_CIRCUMFERENCE_M = 40075016.686;

// About 16 MB of heights: a fullscreen map's worth of tiles plus their neighbours
const CACHE_LIMIT = 64;
const cache = new Map<string, Promise<Float32Array | null>>();

async function fetchDemTile(z: number, x: number, y: number): Promise<Float32Array | null> {
    try {
        const response = await fetch(terrainUrl(z, x, y));
        if (!response.ok) return null;
        // No colour management or alpha handling, which would change the encoded heights
        const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
        const canvas = document.createElement('canvas');
        canvas.width = DEM_SIZE;
        canvas.height = DEM_SIZE;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const { data } = ctx.getImageData(0, 0, DEM_SIZE, DEM_SIZE);
        const heights = new Float32Array(DEM_SIZE * DEM_SIZE);
        for (let i = 0; i < heights.length; i++) {
            heights[i] = data[i * 4] * 256 + data[i * 4 + 1] + data[i * 4 + 2] / 256 - 32768;
        }
        return heights;
    } catch {
        return null;
    }
}

function loadDemTile(z: number, x: number, y: number): Promise<Float32Array | null> {
    const key = `${z}/${x}/${y}`;
    let tile = cache.get(key);
    if (tile) {
        // Most recently used goes last, so the oldest is first out
        cache.delete(key);
    } else {
        tile = fetchDemTile(z, x, y).then(heights => {
            // Don't remember a failure: the next tile drawn here tries again
            if (!heights) cache.delete(key);
            return heights;
        });
    }
    cache.set(key, tile);
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    return tile;
}

/** Heights covering one map tile, plus a border of extra samples around it. */
export interface ElevationWindow {
    /** size x size heights in metres, in rows from north to south */
    heights: Float32Array;
    size: number;
    /** Samples across the map tile itself, not counting the border: 256 up to zoom 15, then 128, 64... */
    n: number;
    border: number;
    /** Ground distance between neighbouring samples */
    metresPerSample: number;
}

/** The heights under map tile z/x/y, with `border` samples beyond each edge, or null if any terrain tile failed. */
export async function elevationWindow(z: number, x: number, y: number, border: number): Promise<ElevationWindow | null> {
    const demZ = Math.min(z, TERRAIN_MAX_ZOOM);
    const n = DEM_SIZE / 2 ** (z - demZ);
    const size = n + 2 * border;
    const tilesAcross = 2 ** demZ;
    const worldSize = tilesAcross * DEM_SIZE;
    // In samples across the whole world at demZ
    const left = x * n - border;
    const top = y * n - border;

    const wrapX = (gx: number) => ((gx % worldSize) + worldSize) % worldSize;
    const clampY = (gy: number) => Math.min(worldSize - 1, Math.max(0, gy));

    const needed = new Map<string, Promise<Float32Array | null>>();
    const lastRow = Math.floor(clampY(top + size - 1) / DEM_SIZE);
    const lastColumn = Math.floor((left + size - 1) / DEM_SIZE);
    for (let ty = Math.floor(clampY(top) / DEM_SIZE); ty <= lastRow; ty++) {
        for (let column = Math.floor(left / DEM_SIZE); column <= lastColumn; column++) {
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

    const heights = new Float32Array(size * size);
    for (let j = 0; j < size; j++) {
        const gy = clampY(top + j);
        const ty = Math.floor(gy / DEM_SIZE);
        const row = (gy % DEM_SIZE) * DEM_SIZE;
        for (let i = 0; i < size; i++) {
            const gx = wrapX(left + i);
            heights[j * size + i] = loaded.get(`${Math.floor(gx / DEM_SIZE)}/${ty}`)![row + (gx % DEM_SIZE)];
        }
    }

    // Web Mercator stretches distances by 1/cos(latitude); measured at the tile's middle
    const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 0.5)) / 2 ** z)));
    const metresPerSample = (EARTH_CIRCUMFERENCE_M * Math.cos(lat)) / worldSize;

    return { heights, size, n, border, metresPerSample };
}

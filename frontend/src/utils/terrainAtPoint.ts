/**
 * The terrain at one point, for the cursor readout on either map: its height and, where the terrain
 * is fine enough to tell, its Slope angle and Aspect. They come from the same Mapterhorn tiles and the
 * same sums as the terrain Overlays, so the readout agrees with what they draw (docs/adr/0009).
 */

import { loadDemTile, OVERLAY_MAX_ZOOM, TERRAIN_TILE_SIZE } from './terrainTiles';
import { ASPECT_SECTORS, STEEPNESS_MIN_ZOOM, aspectSector } from './terrainRendering';

const EARTH_CIRCUMFERENCE_M = 40075016.686;

/** A point on a map, with the map's zoom in the flat map's levels */
export interface TerrainPoint {
    lat: number;
    lon: number;
    zoom: number;
}

export interface TerrainReading {
    /** Metres above sea level, on the map's terrain rather than Open-Meteo's */
    height: number;
    /** Degrees, or null where the terrain on screen is too coarse to tell steepness */
    slopeAngle: number | null;
    /** e.g. "NE", or null on a Flat or where Slope angle is unknown */
    aspect: string | null;
}

/** The terrain at a point, read at the zoom the Overlays would draw it at, or null if its tiles couldn't be had. */
export async function terrainAt({ lat, lon, zoom }: TerrainPoint): Promise<TerrainReading | null> {
    const z = Math.max(0, Math.min(OVERLAY_MAX_ZOOM, Math.round(zoom)));
    const worldSize = 2 ** z * TERRAIN_TILE_SIZE;
    const latRadians = (lat * Math.PI) / 180;
    // In samples across the whole world at z; sample i covers [i, i + 1)
    const x = ((lon + 180) / 360) * worldSize;
    const y = ((1 - Math.log(Math.tan(Math.PI / 4 + latRadians / 2)) / Math.PI) / 2) * worldSize;

    const wrapX = (i: number) => ((i % worldSize) + worldSize) % worldSize;
    const clampY = (j: number) => Math.min(worldSize - 1, Math.max(0, j));
    const tileKey = (i: number, j: number) => `${Math.floor(wrapX(i) / TERRAIN_TILE_SIZE)}/${Math.floor(clampY(j) / TERRAIN_TILE_SIZE)}`;

    // The four samples around the point for its height, and their neighbours for its slope
    const left = Math.floor(x - 0.5);
    const top = Math.floor(y - 0.5);
    const loads = new Map<string, Promise<Float32Array | null>>();
    for (let j = top - 1; j <= top + 2; j++) {
        for (let i = left - 1; i <= left + 2; i++) {
            const key = tileKey(i, j);
            if (!loads.has(key)) {
                const [tx, ty] = key.split('/').map(Number);
                loads.set(key, loadDemTile(z, tx, ty));
            }
        }
    }
    const tiles = new Map<string, Float32Array>();
    for (const [key, load] of loads) {
        const heights = await load;
        if (!heights) return null;
        tiles.set(key, heights);
    }
    const at = (i: number, j: number) =>
        tiles.get(tileKey(i, j))![(clampY(j) % TERRAIN_TILE_SIZE) * TERRAIN_TILE_SIZE + (wrapX(i) % TERRAIN_TILE_SIZE)];

    const fx = x - 0.5 - left;
    const fy = y - 0.5 - top;
    const upper = at(left, top) + (at(left + 1, top) - at(left, top)) * fx;
    const lower = at(left, top + 1) + (at(left + 1, top + 1) - at(left, top + 1)) * fx;
    const height = upper + (lower - upper) * fy;
    if (z < STEEPNESS_MIN_ZOOM) return { height, slopeAngle: null, aspect: null };

    // Horn's method at the sample under the point, as the Overlays work out every sample's slope
    const i = Math.floor(x);
    const j = Math.floor(y);
    const a = at(i - 1, j - 1), b = at(i, j - 1), c = at(i + 1, j - 1);
    const d = at(i - 1, j), f = at(i + 1, j);
    const g = at(i - 1, j + 1), k = at(i, j + 1), l = at(i + 1, j + 1);
    const scale = 8 * ((EARTH_CIRCUMFERENCE_M * Math.cos(latRadians)) / worldSize);
    const east = ((c + 2 * f + l) - (a + 2 * d + g)) / scale;
    const south = ((g + 2 * k + l) - (a + 2 * b + c)) / scale;
    const sector = aspectSector(east, south);
    return {
        height,
        slopeAngle: (Math.atan(Math.hypot(east, south)) * 180) / Math.PI,
        aspect: sector === null ? null : ASPECT_SECTORS[sector].name,
    };
}

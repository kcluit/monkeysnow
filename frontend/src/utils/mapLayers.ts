/**
 * What the map of a Resort or Saved location draws: one Base map, and any number
 * of Overlays over it, of which at most one Terrain colouring. The visitor's choice
 * applies to every map, flat and 3D, and is kept in this browser. Every layer comes
 * from a keyless, openly licensed source
 * (docs/adr/0007-map-layers-from-keyless-openly-licensed-sources.md, docs/adr/0009).
 */

export type BaseMapId = 'standard' | 'satellite';
export type TerrainColouringId = 'slopeAngle' | 'gradient' | 'aspect' | 'heightTint';
export type OverlayId = 'skiMap' | 'contours' | 'hillshade' | 'flats' | TerrainColouringId;

export const BASE_MAPS: readonly { id: BaseMapId; label: string }[] = [
    { id: 'standard', label: 'Standard' },
    { id: 'satellite', label: 'Satellite' },
];

/** Overlays that combine with anything, each ticked on its own */
export const OVERLAYS: readonly { id: Exclude<OverlayId, TerrainColouringId>; label: string }[] = [
    { id: 'skiMap', label: 'Ski map' },
    { id: 'contours', label: 'Contours' },
    { id: 'hillshade', label: 'Hillshade' },
    { id: 'flats', label: 'Flats' },
];

/** Overlays that colour all the ground, so only one is on at a time: two over each other can't be read */
export const TERRAIN_COLOURINGS: readonly { id: TerrainColouringId; label: string }[] = [
    { id: 'slopeAngle', label: 'Slope angle' },
    { id: 'gradient', label: 'Gradient' },
    { id: 'aspect', label: 'Aspect' },
    { id: 'heightTint', label: 'Height tint' },
];

export interface MapLayers {
    baseMap: BaseMapId;
    overlays: OverlayId[];
}

export function isTerrainColouring(id: OverlayId): id is TerrainColouringId {
    return TERRAIN_COLOURINGS.some(c => c.id === id);
}

/** The Terrain colouring that is on, if any */
export function terrainColouring(layers: MapLayers): TerrainColouringId | null {
    return layers.overlays.find(isTerrainColouring) ?? null;
}

/** The same layers with this Overlay on or off; for a Terrain colouring, use withTerrainColouring */
export function withOverlay(layers: MapLayers, overlay: OverlayId, on: boolean): MapLayers {
    const others = layers.overlays.filter(id => id !== overlay);
    return { ...layers, overlays: on ? [...others, overlay] : others };
}

/** The same layers with this Terrain colouring in place of any other, or none */
export function withTerrainColouring(layers: MapLayers, colouring: TerrainColouringId | null): MapLayers {
    const others = layers.overlays.filter(id => !isTerrainColouring(id));
    return { ...layers, overlays: colouring ? [...others, colouring] : others };
}

// The Standard Base map and the Ski map both use OpenStreetMap; one string, so the map credits it once
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const MAP_LAYERS_STORAGE_KEY = 'mapLayers';

// A ski app's map is more use with its Runs and Lifts on, and the lie of the land, so a first visit starts with the Ski map and contours
export const DEFAULT_MAP_LAYERS: MapLayers = { baseMap: 'standard', overlays: ['skiMap', 'contours'] };

// Set once a stored choice has had contours turned on, when they became part of the default
const CONTOURS_ON_MARKER = 'mapLayersContoursOn';

/** One-off: contours are turned on in a visitor's stored choice made before they were on by default. Run before rendering. */
export function turnOnContoursOnce(): void {
    try {
        if (localStorage.getItem(CONTOURS_ON_MARKER)) return;
        const stored: unknown = JSON.parse(localStorage.getItem(MAP_LAYERS_STORAGE_KEY) ?? 'null');
        // Without a stored choice, or with one sanitizeMapLayers can't read, the default applies, contours and all
        if (typeof stored === 'object' && stored !== null) {
            const { overlays } = stored as Partial<MapLayers>;
            if (Array.isArray(overlays) && !overlays.includes('contours')) {
                localStorage.setItem(MAP_LAYERS_STORAGE_KEY, JSON.stringify({ ...stored, overlays: [...overlays, 'contours'] }));
            }
        }
        localStorage.setItem(CONTOURS_ON_MARKER, 'true');
    } catch (err) {
        console.error('Error turning on contours:', err);
    }
}

/** The stored choice, with anything this version doesn't know about dropped, and at most one Terrain colouring. */
export function sanitizeMapLayers(value: unknown): MapLayers {
    const stored = value as Partial<MapLayers> | null;
    if (typeof stored !== 'object' || stored === null) return DEFAULT_MAP_LAYERS;
    const baseMap = BASE_MAPS.some(b => b.id === stored.baseMap) ? stored.baseMap! : DEFAULT_MAP_LAYERS.baseMap;
    if (!Array.isArray(stored.overlays)) return { baseMap, overlays: DEFAULT_MAP_LAYERS.overlays };
    const overlays: OverlayId[] = OVERLAYS.map(o => o.id).filter(id => stored.overlays!.includes(id));
    const colouring = TERRAIN_COLOURINGS.find(c => stored.overlays!.includes(c.id));
    if (colouring) overlays.push(colouring.id);
    return { baseMap, overlays };
}

/**
 * What the map of a Resort or Saved location draws: one Base map, and any number
 * of Overlays over it. The visitor's choice applies to every map and is kept in
 * this browser. Every layer comes from a keyless, openly licensed source
 * (docs/adr/0007-map-layers-from-keyless-openly-licensed-sources.md).
 */

export type BaseMapId = 'standard' | 'satellite';
export type OverlayId = 'skiMap' | 'contours' | 'hillshade' | 'slopeAngle';

export const BASE_MAPS: readonly { id: BaseMapId; label: string }[] = [
    { id: 'standard', label: 'Standard' },
    { id: 'satellite', label: 'Satellite' },
];

export const OVERLAYS: readonly { id: OverlayId; label: string }[] = [
    { id: 'skiMap', label: 'Ski map' },
    { id: 'contours', label: 'Contours' },
    { id: 'hillshade', label: 'Hillshade' },
    { id: 'slopeAngle', label: 'Slope angle' },
];

export interface MapLayers {
    baseMap: BaseMapId;
    overlays: OverlayId[];
}

// The Standard Base map and the Ski map both use OpenStreetMap; one string, so the map credits it once
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const MAP_LAYERS_STORAGE_KEY = 'mapLayers';

// A ski app's map is more use with its Runs and Lifts on, so a first visit starts with the Ski map
export const DEFAULT_MAP_LAYERS: MapLayers = { baseMap: 'standard', overlays: ['skiMap'] };

/** The stored choice, with anything this version doesn't know about dropped. */
export function sanitizeMapLayers(value: unknown): MapLayers {
    const stored = value as Partial<MapLayers> | null;
    if (typeof stored !== 'object' || stored === null) return DEFAULT_MAP_LAYERS;
    const baseMap = BASE_MAPS.some(b => b.id === stored.baseMap) ? stored.baseMap! : DEFAULT_MAP_LAYERS.baseMap;
    const overlays = Array.isArray(stored.overlays)
        ? OVERLAYS.map(o => o.id).filter(id => stored.overlays!.includes(id))
        : DEFAULT_MAP_LAYERS.overlays;
    return { baseMap, overlays };
}

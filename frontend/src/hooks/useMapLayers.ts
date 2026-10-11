import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_MAP_LAYERS, MAP_LAYERS_STORAGE_KEY, sanitizeMapLayers, type MapLayers } from '../utils/mapLayers';

/** The visitor's Base map and Overlays, the same on every map, flat and 3D, and on the Settings page and command palette */
export function useMapLayers(): [MapLayers, (layers: MapLayers) => void] {
    const [storedLayers, setStoredLayers] = useLocalStorage<unknown>(MAP_LAYERS_STORAGE_KEY, DEFAULT_MAP_LAYERS);
    const layers = useMemo(() => sanitizeMapLayers(storedLayers), [storedLayers]);
    const setLayers = useCallback((next: MapLayers) => setStoredLayers(next), [setStoredLayers]);
    return [layers, setLayers];
}

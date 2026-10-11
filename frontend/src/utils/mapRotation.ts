/**
 * How dragging sideways with the right mouse button (or Ctrl and the left) turns the 3D map:
 * - linear: dragging right always turns it the same way, wherever the pointer is, as on Mapbox maps
 * - orbital: it turns as if spinning a globe by the pointer, so opposite ways above and below the middle
 * MapLibre's default is orbital, which felt inverted on mountains seen from the side, so linear is ours.
 */
export type MapRotation = 'linear' | 'orbital';

export const MAP_ROTATION_STORAGE_KEY = 'mapRotation';
export const DEFAULT_MAP_ROTATION: MapRotation = 'linear';

/**
 * How dragging sideways with the right mouse button (or Ctrl and the left) turns the 3D map:
 * - linear: dragging right turns the view right, wherever the pointer is, as on Mapbox maps
 * - linearReversed: dragging right turns the view left, so the far mountains follow the pointer
 * - orbital: it turns as if spinning a globe by the pointer, so opposite ways above and below the middle
 * MapLibre's default is orbital, which felt inverted on mountains seen from the side, so linear is ours.
 */
export type MapRotation = 'linear' | 'linearReversed' | 'orbital';

export const MAP_ROTATION_STORAGE_KEY = 'mapRotation';
export const DEFAULT_MAP_ROTATION: MapRotation = 'linear';

/** Which way dragging up and down with the right mouse button (or Ctrl and the left) tilts the 3D map toward the horizon */
export type MapTilt = 'dragUp' | 'dragDown';

export const MAP_TILT_STORAGE_KEY = 'mapTilt';
export const DEFAULT_MAP_TILT: MapTilt = 'dragUp';

// MapLibre's own speeds, in degrees per pixel dragged
const ROTATE_SPEED = 0.8;
const PITCH_SPEED = 0.5;

/**
 * The MapLibre options for both settings, which it only takes when a map is created.
 * They change mouse drags only: a two-finger tilt and dragging the compass button keep MapLibre's directions.
 */
export function mapDragOptions(rotation: MapRotation, tilt: MapTilt): { aroundCenter: boolean; rotateSpeed: number; pitchSpeed: number } {
    return {
        aroundCenter: rotation === 'orbital',
        rotateSpeed: rotation === 'linearReversed' ? -ROTATE_SPEED : ROTATE_SPEED,
        // Negative tilts toward the horizon as the pointer moves up the screen
        pitchSpeed: tilt === 'dragUp' ? -PITCH_SPEED : PITCH_SPEED,
    };
}

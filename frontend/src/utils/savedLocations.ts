/**
 * Saved locations: Custom locations a visitor has named and kept.
 *
 * They live in this browser's localStorage and nowhere else; there is no
 * backend to share them through (docs/adr/0001). In the Selection a Saved
 * location is "saved:<key>", which no Resort slug or alias can ever be, and
 * its detail view is /location/<key>.
 */

import { RESORT_LOCATIONS, nearestResortId } from '../data/resortLocations';

export interface SavedLocation {
    /** Its ID in the Selection, e.g. "saved:k3j9x2qa" */
    id: string;
    name: string;
    lat: number;
    lon: number;
    /** The one elevation it is forecast at, in metres */
    elevation: number;
    /** ISO country code of the Resort nearest to it when it was saved; picks its Card model */
    country: string;
}

export type SavedLocationInput = Pick<SavedLocation, 'name' | 'lat' | 'lon' | 'elevation'>;

/** The elevations a Saved location may be given, in metres. */
export const MIN_SAVED_ELEVATION = 0;
export const MAX_SAVED_ELEVATION = 9000;

export const MAX_SAVED_NAME_LENGTH = 60;

const STORAGE_KEY = 'savedLocations';
const ID_PREFIX = 'saved:';

export const isSavedLocationId = (id: string): boolean => id.startsWith(ID_PREFIX);

/** The detail view of a Saved location. */
export const savedLocationPath = (id: string): string =>
    `/location/${encodeURIComponent(id.slice(ID_PREFIX.length))}`;

/** The Selection ID behind a /location/<key> URL. */
export const savedLocationIdFromKey = (key: string): string => ID_PREFIX + key;

function isSavedLocation(value: unknown): value is SavedLocation {
    const v = value as SavedLocation;
    return typeof v === 'object' && v !== null
        && typeof v.id === 'string' && isSavedLocationId(v.id)
        && typeof v.name === 'string'
        && Number.isFinite(v.lat) && Number.isFinite(v.lon) && Number.isFinite(v.elevation)
        && typeof v.country === 'string';
}

function read(): SavedLocation[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter(isSavedLocation) : [];
    } catch {
        return [];
    }
}

// Read on first use rather than on import, so main.tsx's one-off reset of stored data runs first
let savedLocations: SavedLocation[] | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

function write(next: SavedLocation[]): void {
    savedLocations = next;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Storage unavailable (private mode, full): kept for this visit only
    }
    notify();
}

// Another tab saved, edited or deleted one
window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
        savedLocations = read();
        notify();
    }
});

export function getSavedLocations(): SavedLocation[] {
    savedLocations ??= read();
    return savedLocations;
}

export function getSavedLocation(id: string): SavedLocation | undefined {
    return getSavedLocations().find((location) => location.id === id);
}

export function subscribeSavedLocations(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** The name the Save dialog suggests: "Near" the nearest Resort. */
export function suggestedName(lat: number, lon: number): string {
    const nearest = RESORT_LOCATIONS.get(nearestResortId(lat, lon));
    return nearest ? `Near ${nearest.displayName}` : 'My location';
}

function newId(): string {
    let id: string;
    do {
        id = ID_PREFIX + Math.random().toString(36).slice(2, 10);
    } while (getSavedLocation(id));
    return id;
}

export function saveLocation({ name, lat, lon, elevation }: SavedLocationInput): SavedLocation {
    // The nearest Resort's country, found once here, picks the Card model from now on
    const nearest = RESORT_LOCATIONS.get(nearestResortId(lat, lon));
    const location: SavedLocation = { id: newId(), name, lat, lon, elevation, country: nearest?.country ?? '' };
    write([...getSavedLocations(), location]);
    return location;
}

export function updateSavedLocation(id: string, changes: Pick<SavedLocation, 'name' | 'elevation'>): void {
    write(getSavedLocations().map((location) => (location.id === id ? { ...location, ...changes } : location)));
}

export function deleteSavedLocation(id: string): void {
    write(getSavedLocations().filter((location) => location.id !== id));
}

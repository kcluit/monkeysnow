/**
 * Starter resort: the one Resort a first-time visitor's Selection begins with.
 *
 * It is the Resort whose page they arrived on, otherwise the one nearest to
 * where Netlify places their IP address, otherwise a random one. See
 * docs/adr/0002-locate-first-time-visitors-with-a-netlify-edge-function.md.
 */

import { matchPath } from 'react-router-dom';
import { RESORT_LOCATIONS, nearestResortId, resolveResortId } from '../data/resortLocations';

/** Served by frontend/netlify/edge-functions/geo.ts; absent under plain `vite`. */
const GEO_URL = '/api/geo';

/** How long a first visit waits for the visitor's location before going random. */
const LOCATE_TIMEOUT_MS = 3_000;

interface Coordinates {
    latitude: number;
    longitude: number;
}

export async function pickStarterResort(landingPath: string, signal: AbortSignal): Promise<string> {
    // Old IDs from search engines' indexes (e.g. /resort/Big-White) count as landing on that Resort
    const landedOn = matchPath('/resort/:resortId', landingPath)?.params.resortId;
    const landedOnResort = landedOn ? resolveResortId(landedOn) : null;
    if (landedOnResort) return landedOnResort;

    const visitor = await locateVisitor(signal);
    return visitor ? nearestResortId(visitor.latitude, visitor.longitude) : randomResort();
}

/** Where the visitor appears to be, or null if that isn't known within the timeout. */
async function locateVisitor(signal: AbortSignal): Promise<Coordinates | null> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort);
    const timer = setTimeout(abort, LOCATE_TIMEOUT_MS);

    try {
        const response = await fetch(GEO_URL, { signal: controller.signal });
        if (!response.ok) return null;
        const { latitude, longitude } = await response.json();
        return typeof latitude === 'number' && typeof longitude === 'number' ? { latitude, longitude } : null;
    } catch {
        return null; // timed out, offline, or no edge function (dev server serves index.html)
    } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
    }
}

function randomResort(): string {
    const ids = [...RESORT_LOCATIONS.keys()];
    return ids[Math.floor(Math.random() * ids.length)];
}

import { useSyncExternalStore } from 'react';
import { getSlopeBands, subscribeSlopeBands, type SlopeBand } from '../utils/slopeBands';

/** The visitor's Slope bands, the same on both maps. */
export function useSlopeBands(): readonly SlopeBand[] {
    return useSyncExternalStore(subscribeSlopeBands, getSlopeBands);
}

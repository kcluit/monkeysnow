import { useSyncExternalStore } from 'react';
import { getSavedLocations, subscribeSavedLocations, type SavedLocation } from '../utils/savedLocations';

/** This browser's Saved locations, in the order they were saved. */
export function useSavedLocations(): SavedLocation[] {
    return useSyncExternalStore(subscribeSavedLocations, getSavedLocations);
}

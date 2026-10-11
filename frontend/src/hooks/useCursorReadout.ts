import { useSyncExternalStore } from 'react';
import { getCursorReadoutShown, setCursorReadoutShown, subscribeCursorReadout } from '../utils/cursorReadout';

/** Whether the Cursor readout shows on the maps, and a way to turn it on or off. */
export function useCursorReadout(): [boolean, (shown: boolean) => void] {
    return [useSyncExternalStore(subscribeCursorReadout, getCursorReadoutShown), setCursorReadoutShown];
}

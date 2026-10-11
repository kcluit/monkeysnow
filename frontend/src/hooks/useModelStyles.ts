import { useSyncExternalStore } from 'react';
import { getModelStyles, subscribeModelStyles, type ModelStyles } from '../utils/modelStyles';

/** The visitor's Model styles, and the other choices made in the Models tab. */
export function useModelStyles(): ModelStyles {
    return useSyncExternalStore(subscribeModelStyles, getModelStyles);
}

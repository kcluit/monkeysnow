import { useSyncExternalStore } from 'react';
import { getCountryModels, subscribeCountryModels, type CountryModels } from '../utils/cardModels';

/** The Country models this browser's visitor has chosen, by ISO country code. */
export function useCountryModels(): CountryModels {
    return useSyncExternalStore(subscribeCountryModels, getCountryModels);
}

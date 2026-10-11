import { useLocalStorage } from './useLocalStorage';
import { RECOMMENDED_MODELS } from '../data/modelHierarchy';
import type { AggregationType, WeatherModel } from '../types/openMeteo';

type Setter<T> = (value: T | ((prev: T) => T)) => void;

/**
 * The visitor's Preferred models: one list for every Resort, starting as the Recommended models.
 * A new key wiped saved model lists once (docs/adr/0003, docs/adr/0005).
 */
export function usePreferredModels(): [WeatherModel[], Setter<WeatherModel[]>] {
    return useLocalStorage<WeatherModel[]>('detailPreferredModelsV2', RECOMMENDED_MODELS);
}

/** The Aggregations drawn: none at first, since two models have no useful median (docs/adr/0005). */
export function useSelectedAggregations(): [AggregationType[], Setter<AggregationType[]>] {
    return useLocalStorage<AggregationType[]>('detailSelectedAggregationsV2', []);
}

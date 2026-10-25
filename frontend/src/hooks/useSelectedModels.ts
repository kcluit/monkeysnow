import { useLocalStorage } from './useLocalStorage';
import { useLanguage } from './useLanguage';
import { RECOMMENDED_MODELS, aggregationOptions, getModelInfo } from '../data/modelHierarchy';
import type { AggregationType, WeatherModel } from '../types/openMeteo';

type Setter<T> = (value: T | ((prev: T) => T)) => void;

/**
 * The visitor's Selected models: one list for every Resort, starting as the Recommended models.
 * A new key wiped saved model lists once (docs/adr/0003, docs/adr/0005); this one keeps their
 * earlier name, Preferred models, so renaming them didn't.
 */
export function useSelectedModels(): [WeatherModel[], Setter<WeatherModel[]>] {
    return useLocalStorage<WeatherModel[]>('detailPreferredModelsV2', RECOMMENDED_MODELS);
}

/** The Aggregations drawn: none at first, since two models have no useful median (docs/adr/0005). */
export function useSelectedAggregations(): [AggregationType[], Setter<AggregationType[]>] {
    return useLocalStorage<AggregationType[]>('detailSelectedAggregationsV2', []);
}

/** e.g. "ECMWF IFS HRES, NOAA GFS Seamless + Median", or "6 models + 3 Aggregations" when there are more, for the Settings page */
export function useDetailedViewModelsSummary(): string {
    const { t } = useLanguage();
    const [selectedModels] = useSelectedModels();
    const [selectedAggregations] = useSelectedAggregations();
    const models = selectedModels.length === 0 ? t('detail.summary.noModels')
        : selectedModels.length <= 3 ? selectedModels.map((model) => getModelInfo(model)?.label ?? model).join(', ')
        : t('detail.summary.models', { count: selectedModels.length });
    if (selectedAggregations.length === 0) return models;
    const aggregations = selectedAggregations.length <= 2
        ? selectedAggregations.map((id) => aggregationOptions.find((option) => option.id === id)?.name ?? id).join(', ')
        : t('detail.summary.aggregations', { count: selectedAggregations.length });
    return `${models} + ${aggregations}`;
}

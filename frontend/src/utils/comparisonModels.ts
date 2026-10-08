/**
 * Turns the fetched Preferred models into the Comparison models: drops models that
 * came back with no data and Clones (see CONTEXT.md and docs/adr/0003).
 */

import type { WeatherModel, HourlyDataPoint } from '../types/openMeteo';
import { hasGlobalCoverage, inCatalogueOrder } from '../data/modelHierarchy';

export type DroppedModel =
    | { reason: 'no-data' }
    | { reason: 'clone'; of: WeatherModel };

export interface ComparisonModelsResult {
    comparisonModels: WeatherModel[];
    dropped: Map<WeatherModel, DroppedModel>;
}

/** Fewer matching values than this is too little evidence to call two models Clones. */
const MIN_MATCHING_VALUES = 24;

function isValue(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v);
}

function hasAnyValue(points: HourlyDataPoint[]): boolean {
    return points.some((point) =>
        Object.entries(point).some(([key, v]) => key !== 'time' && key !== 'timestamp' && isValue(v))
    );
}

function variablesOf(points: HourlyDataPoint[]): string[] {
    return Object.keys(points[0] ?? {}).filter((key) => key !== 'time' && key !== 'timestamp');
}

/**
 * Two models are Clones when every variable both provide has identical numbers at
 * every hour, including where each has no value. A model that only shares part of
 * the forecast with another (HRRR inside GFS Seamless) is not a Clone.
 */
export function isClone(a: HourlyDataPoint[], b: HourlyDataPoint[]): boolean {
    if (a.length !== b.length || a.length === 0) return false;

    let matching = 0;
    for (const variable of variablesOf(a)) {
        const providedByA = a.some((point) => isValue(point[variable]));
        const providedByB = b.some((point) => isValue(point[variable]));
        if (!providedByA || !providedByB) continue;

        for (let i = 0; i < a.length; i++) {
            const x = a[i][variable];
            const y = b[i][variable];
            if (isValue(x) !== isValue(y)) return false;
            if (isValue(x)) {
                if (x !== y) return false;
                matching++;
            }
        }
    }
    return matching >= MIN_MATCHING_VALUES;
}

/**
 * Models still loading are neither shown nor dropped. Between two Clones, the model
 * with global Coverage is kept (the other is the one falling back to it); otherwise
 * the one earlier in the catalogue.
 */
export function resolveComparisonModels(
    fetchedModels: WeatherModel[],
    data: Map<WeatherModel, HourlyDataPoint[]> | null,
    unavailable: ReadonlySet<WeatherModel>
): ComparisonModelsResult {
    const dropped = new Map<WeatherModel, DroppedModel>();
    const withData: WeatherModel[] = [];

    for (const model of fetchedModels) {
        const points = data?.get(model);
        if (unavailable.has(model) || (points && !hasAnyValue(points))) {
            dropped.set(model, { reason: 'no-data' });
        } else if (points) {
            withData.push(model);
        }
    }

    const byPriority = inCatalogueOrder(withData).sort(
        (a, b) => Number(hasGlobalCoverage(b)) - Number(hasGlobalCoverage(a))
    );
    const kept: WeatherModel[] = [];
    for (const model of byPriority) {
        const original = kept.find((k) => isClone(data!.get(model)!, data!.get(k)!));
        if (original) {
            dropped.set(model, { reason: 'clone', of: original });
        } else {
            kept.push(model);
        }
    }

    const keptSet = new Set(kept);
    return {
        comparisonModels: fetchedModels.filter((model) => keptSet.has(model)),
        dropped,
    };
}

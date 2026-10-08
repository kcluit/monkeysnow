/**
 * Which Forecast model each main-page card is fetched from (see CONTEXT.md and docs/adr/0006).
 *
 * Every country has a Recommended card model, shown as "Auto". A visitor may choose a
 * Country model in its place, one country at a time; the choices live in this browser's
 * localStorage. Where a Country model doesn't cover a point, or Open-Meteo has no data
 * from it there, that card uses the Recommended card model instead.
 */

import { RESORT_HIERARCHY, RESORT_LOCATIONS, continentOfCountry } from '../data/resortLocations';
import { coversPoint, getModelInfo, hasGlobalCoverage, isKnownModel, modelProviders, type ModelInfo } from '../data/modelHierarchy';
import type { WeatherModel } from '../types/openMeteo';

// --- Recommended card models ---

// Recommended card model by ISO country code
const COUNTRY_RECOMMENDATIONS: Partial<Record<string, WeatherModel>> = {
    CA: 'cmc_gem_seamless',
    US: 'ncep_gfs_seamless',
    JP: 'jma_seamless',
    // MET Norway Nordic Seamless — Scandinavia & Nordics
    NO: 'metno_seamless',
    SE: 'metno_seamless',
    FI: 'metno_seamless',
    IS: 'metno_seamless',
    // DMI Seamless — Denmark & Greenland
    DK: 'dmi_seamless',
};
// Rest of Europe, Alps included: ICON's European model covers the whole continent
const EUROPE_MODEL: WeatherModel = 'dwd_icon_seamless';
// Everywhere else: ECMWF IFS at 9 km, the strongest global model Open-Meteo serves.
// KMA (Korea) and BOM (Australia) returned no data at resorts when this was chosen.
const DEFAULT_MODEL: WeatherModel = 'ecmwf_ifs';

export function recommendedCardModel(country: string): WeatherModel {
    return COUNTRY_RECOMMENDATIONS[country]
        ?? (continentOfCountry(country) === 'Europe' ? EUROPE_MODEL : DEFAULT_MODEL);
}

/** Whether a model can fill a card at all: known, and serving every variable a card needs. */
function canFillCards(model: string): model is WeatherModel {
    return isKnownModel(model) && !getModelInfo(model)?.noCards;
}

// --- Country models ---

/** ISO country code -> the Country model a visitor chose there. A country left out is on Auto. */
export type CountryModels = Readonly<Record<string, WeatherModel>>;

const STORAGE_KEY = 'countryModels';

function read(): CountryModels {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
        // A model since dropped from the catalogue, or no longer able to fill a card, counts as Auto
        return Object.fromEntries(
            Object.entries(parsed).filter((entry): entry is [string, WeatherModel] =>
                typeof entry[1] === 'string' && canFillCards(entry[1]))
        );
    } catch {
        return {};
    }
}

// Read on first use rather than on import, so main.tsx's one-off reset of stored data runs first
let countryModels: CountryModels | null = null;
const listeners = new Set<() => void>();

function write(next: CountryModels): void {
    countryModels = next;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Storage unavailable (private mode, full): kept for this visit only
    }
    listeners.forEach((listener) => listener());
}

// Another tab changed a Country model
window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
        countryModels = read();
        listeners.forEach((listener) => listener());
    }
});

export function getCountryModels(): CountryModels {
    countryModels ??= read();
    return countryModels;
}

export function subscribeCountryModels(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Chooses a country's Country model, or with null puts it back on Auto. */
export function setCountryModel(country: string, model: WeatherModel | null): void {
    const { [country]: _previous, ...rest } = getCountryModels();
    if (model) forgetGaps(model);
    write(model ? { ...rest, [country]: model } : rest);
}

/** Every country with Resorts gets the same Country model; only a global model covers them all. */
export function setEveryCountryModel(model: WeatherModel): void {
    if (!hasGlobalCoverage(model) || !canFillCards(model)) return;
    forgetGaps(model);
    write(Object.fromEntries(RESORT_HIERARCHY.flatMap((continent) =>
        continent.countries.map((country) => [country.code, model]))));
}

export function resetCountryModels(): void {
    write({});
}

// --- Gaps: points a Country model's Coverage box takes in but Open-Meteo has no data for ---

const GAPS_KEY = 'countryModelGaps';
let gaps: Record<string, string[]> | null = null;

function getGaps(): Record<string, string[]> {
    if (!gaps) {
        try {
            const parsed: unknown = JSON.parse(localStorage.getItem(GAPS_KEY) ?? '{}');
            gaps = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
                ? parsed as Record<string, string[]>
                : {};
        } catch {
            gaps = {};
        }
    }
    return gaps;
}

function writeGaps(next: Record<string, string[]>): void {
    gaps = next;
    try {
        localStorage.setItem(GAPS_KEY, JSON.stringify(next));
    } catch {
        // Storage unavailable: found again on the next visit
    }
}

function hasGap(model: WeatherModel, resortId: string): boolean {
    return getGaps()[model]?.includes(resortId) ?? false;
}

/** Remembers that Open-Meteo has no data from `model` at this Resort or Saved location. */
export function markGap(model: WeatherModel, resortId: string): void {
    if (hasGap(model, resortId)) return;
    const current = getGaps();
    writeGaps({ ...current, [model]: [...(current[model] ?? []), resortId] });
}

/** Choosing a model again checks its gaps again, in case Open-Meteo's data has grown since. */
function forgetGaps(model: WeatherModel): void {
    const { [model]: _forgotten, ...rest } = getGaps();
    writeGaps(rest);
}

// --- Card models ---

/**
 * The Card model of a Resort or Saved location at (lat, lon) whose Card model is picked
 * by `country`: the visitor's Country model where it covers the point and has data
 * there, otherwise the Recommended card model.
 */
export function cardModelAt(resortId: string, country: string, lat: number, lon: number): WeatherModel {
    const chosen = getCountryModels()[country];
    if (chosen && coversPoint(chosen, lat, lon) && !hasGap(chosen, resortId)) return chosen;
    return recommendedCardModel(country);
}

// --- What the settings modal offers ---

export interface CountryModelOption {
    info: ModelInfo;
    /** How many of the country's Resorts its Coverage includes; left out where every Resort counts */
    covered?: number;
}

export interface CountryModelProvider {
    name: string;
    options: CountryModelOption[];
}

let resortPointsByCountry: Map<string, [number, number][]> | null = null;

function resortPointsOf(country: string): [number, number][] {
    if (!resortPointsByCountry) {
        resortPointsByCountry = new Map();
        for (const resort of RESORT_LOCATIONS.values()) {
            const points = resortPointsByCountry.get(resort.country) ?? [];
            points.push(resort.loc);
            resortPointsByCountry.set(resort.country, points);
        }
    }
    return resortPointsByCountry.get(country) ?? [];
}

const optionsByCountry = new Map<string, CountryModelProvider[]>();

/**
 * The models a country can be given, by Provider in catalogue order: every model that
 * can fill a card and whose Coverage includes at least one of the country's Resorts.
 */
export function countryModelOptions(country: string): CountryModelProvider[] {
    let providers = optionsByCountry.get(country);
    if (!providers) {
        const points = resortPointsOf(country);
        providers = modelProviders
            .map((provider) => ({
                name: provider.name,
                options: provider.models
                    .filter((info) => canFillCards(info.id))
                    .map((info) => ({
                        info,
                        covered: points.filter(([lat, lon]) => coversPoint(info.id, lat, lon)).length,
                    }))
                    .filter((option) => option.covered > 0),
            }))
            .filter((provider) => provider.options.length > 0);
        optionsByCountry.set(country, providers);
    }
    return providers;
}

/** The models "Use one model everywhere" offers: global ones, which cover every Resort. */
export function everywhereModelOptions(): CountryModelProvider[] {
    return modelProviders
        .map((provider) => ({
            name: provider.name,
            options: provider.models
                .filter((info) => info.coverage === 'global' && canFillCards(info.id))
                .map((info) => ({ info })),
        }))
        .filter((provider) => provider.options.length > 0);
}

/**
 * Fetches Resort forecasts from Open-Meteo and shapes them into ResortData:
 * three Elevation bands, each split into AM/PM/NIGHT periods with snow estimates.
 * A Saved location is fetched at its one elevation, and that forecast stands in
 * for all three bands, so cards and sorting treat it like any Resort.
 *
 * Ported from the old Express backend so forecasts keep exactly the shape and
 * numbers the backend used to serve. The one exception is freezing level in
 * GFS regions; see MODELS_WITH_FREEZING_LEVEL.
 */

import { RESORT_LOCATIONS, continentOfCountry } from '../data/resortLocations';
import { fetchWeatherApiWithinBudget, isNoDataError, type FetchPriority } from './openMeteoBudget';
import { cardModelAt, markGap, recommendedCardModel } from './cardModels';
import { getSavedLocation, isSavedLocationId } from './savedLocations';
import type { DayData, ElevationForecast, PeriodData, ResortData, SnowQuality } from '../types';
import type { WeatherModel } from '../types/openMeteo';

type ApiResponse = Awaited<ReturnType<typeof fetchWeatherApiWithinBudget>>[number];

/**
 * The main page's Forecast horizon. A card shows fewer days when its Card model's
 * Range ends sooner (ICON in Europe, GEM in Canada). Open-Meteo counts up to 14 days
 * as one call, so this is as far as it goes without costing more of the Fetch budget.
 */
const FORECAST_DAYS = 14;

/** Resorts per request; 25 resorts x 3 Elevation bands = at most 75 locations. */
const RESORTS_PER_REQUEST = 25;

// Order matters: processLocation reads variables by index
const MAIN_VARIABLES = [
    'wind_speed_10m',       // 0
    'wind_direction_10m',   // 1
    'temperature_2m',       // 2
    'relative_humidity_2m', // 3
    'precipitation',        // 4
    'weather_code',         // 5
    'surface_pressure',     // 6
    'rain',                 // 7
    'snowfall',             // 8
];
const FREEZING_LEVEL_INDEX = MAIN_VARIABLES.length; // 9, when requested with the main variables

// --- Math Helpers for Aggregation ---
const getAverage = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const getSum = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) : 0;
const getMax = (arr: number[]) => arr.length ? Math.max(...arr) : 0;
const getMin = (arr: number[]) => arr.length ? Math.min(...arr) : 0;
const getMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const getMode = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const counts: Record<number, number> = {};
    let maxFreq = 0;
    let mode = arr[0];
    for (const num of arr) {
        counts[num] = (counts[num] || 0) + 1;
        if (counts[num] > maxFreq) { maxFreq = counts[num]; mode = num; }
        else if (counts[num] === maxFreq && num > mode) { mode = num; }
    }
    return mode;
};

/**
 * Rounds like the backend did, and turns NaN (hours past a model's range) into
 * null, as JSON serialisation used to.
 */
const fixed = (value: number, digits: number): number =>
    (Number.isFinite(value) ? parseFloat(value.toFixed(digits)) : null) as number;

// --- Snow Estimation (Crystal Habit-Based with Kuchera Ratios) ---

interface HourlySnowEstimate {
    snowCm: number;
    ratio: number;
    snowFraction: number;
    quality: SnowQuality;
}

/**
 * Calculates the Wet Bulb Temperature using the Stull (2011) approximation.
 */
function calculateWetBulb(tempC: number, rh: number): number {
    const safeRh = Math.max(0, Math.min(100, rh));
    const term1 = tempC * Math.atan(0.151977 * Math.pow(safeRh + 8.313659, 0.5));
    const term2 = Math.atan(tempC + safeRh);
    const term3 = Math.atan(safeRh - 1.676331);
    const term4 = 0.00391838 * Math.pow(safeRh, 1.5) * Math.atan(0.023101 * safeRh);
    const term5 = 4.686035;
    return term1 + term2 - term3 + term4 - term5;
}

/**
 * Calculates what percentage of precipitation actually contributes to accumulation.
 * - Warm (> 0.5C WB): 0% Snow (All rain)
 * - Transition (-2.0C to 0.5C WB): 10% - 100% Snow (Slush/Mix)
 * - Cold (< -2.0C WB): 100% Snow
 */
function calculateSnowFraction(wetBulbC: number): number {
    // Warm Zone: Pure Rain
    if (wetBulbC >= 0.5) return 0.0;
    // Slush Zone: Mostly rain, very little sticking
    if (wetBulbC >= -0.5) return 0.1;
    // Transition Zone (-2.0C to -0.5C): Linear interpolation 20% to 100%
    if (wetBulbC > -2.0) {
        const slope = (1.0 - 0.2) / (-2.0 - (-0.5));
        const fraction = 0.2 + slope * (wetBulbC - (-0.5));
        return Math.min(1.0, Math.max(0.0, fraction));
    }
    // Cold Zone: All Snow
    return 1.0;
}

/**
 * Determines the Snow-to-Liquid Ratio (SLR) based on Wet Bulb Temperature.
 * Uses Kuchera method with crystal habit-based ratios:
 * - 0 to -4: Thin Plates (Wet) -> 3:1
 * - -4 to -10: Needles/Columns (Avg) -> 7:1
 * - -10 to -12: Transition -> 10:1
 * - -12 to -18: Dendrites (DGZ - Fluffy) -> 15:1
 * - < -18: Plates/Columns (Dense) -> 12:1
 */
function getKucheraRatio(wetBulbC: number): number {
    // Warm/Rain Zone
    if (wetBulbC > 0) return 1;
    // Thin Plates / Dendritic fragments (0 to -4)
    if (wetBulbC > -4) return 4;
    // Needles / Columns (-4 to -10)
    if (wetBulbC > -10) return 10;
    // Transition Zone (-10 to -12)
    if (wetBulbC > -12) return 15;
    // Dendritic Growth Zone / Stellar Dendrites (-12 to -18)
    if (wetBulbC > -18) return 22;
    // Cold / Plates & Columns (< -18)
    return 12;
}

/**
 * Determines snow quality based on wet bulb temp and snow fraction.
 */
function getSnowQuality(wetBulbC: number, snowFraction: number): SnowQuality {
    if (snowFraction === 0) return 'rain';
    if (snowFraction < 0.5) return 'sleet/mix';
    if (wetBulbC > -4) return 'wet_snow';        // 0 to -4: Thin Plates/Wet
    if (wetBulbC <= -12 && wetBulbC >= -18) return 'powder'; // -12 to -18: DGZ/Fluffy
    return 'dry_snow'; // -4 to -12 and < -18
}

function estimateHourlySnow(tempC: number, humidity: number, snowfallCm: number): HourlySnowEstimate {
    const wetBulb = calculateWetBulb(tempC, humidity);
    const snowFraction = calculateSnowFraction(wetBulb);
    const ratio = getKucheraRatio(wetBulb);

    // Convert Open-Meteo snowfall (cm) to snowfall water equivalent (mm) using open-meteo's 0.7 factor
    const sweMm = snowfallCm / 0.7;
    const snowMm = sweMm * ratio;
    const snowCm = snowMm / 10;

    return {
        snowCm,
        ratio,
        snowFraction,
        quality: getSnowQuality(wetBulb, snowFraction)
    };
}

// --- Model selection (Card models themselves are picked in cardModels.ts) ---

const EUROPE_FREEZING_MODEL: WeatherModel = 'dwd_icon_seamless';
const DEFAULT_FREEZING_MODEL: WeatherModel = 'ncep_gfs_seamless';

/**
 * Main models whose freezing level is taken from the main request, saving a call per resort.
 * With an elevation set, Open-Meteo may pick a neighbouring grid cell: for GFS that moves
 * the freezing level by at most a few tens of metres, but for ICON in the Alps by up to
 * 400 m, so ICON keeps its own request at the resort's terrain elevation.
 */
const MODELS_WITH_FREEZING_LEVEL = new Set<WeatherModel>(['ncep_gfs_seamless']);

/** Where a member of the Selection is forecast, and the country that picks its Card model. */
interface ForecastPoint {
    lat: number;
    lon: number;
    /** A Resort's three Elevation bands (bot, mid, top), or a Saved location's one elevation */
    elevations: number[];
    country: string;
    continent: string | null;
}

function forecastPointOf(id: string): ForecastPoint | null {
    const resort = RESORT_LOCATIONS.get(id);
    if (resort) {
        return {
            lat: resort.loc[0],
            lon: resort.loc[1],
            elevations: [resort.bot, resort.mid, resort.top],
            country: resort.country,
            continent: resort.continent,
        };
    }
    const saved = getSavedLocation(id);
    if (saved) {
        return {
            lat: saved.lat,
            lon: saved.lon,
            elevations: [saved.elevation],
            country: saved.country,
            continent: continentOfCountry(saved.country),
        };
    }
    return null;
}

interface RequestPlan {
    model: WeatherModel;
    freezingModel: WeatherModel | null; // null when the main model provides the freezing level
    /** Whether `model` is the visitor's Country model rather than the Recommended card model */
    isCountryModel: boolean;
}

function planFor(resortId: string, point: ForecastPoint | null): RequestPlan {
    const inEurope = point?.continent === 'Europe';
    const recommended = recommendedCardModel(point?.country ?? '');
    const model = point ? cardModelAt(resortId, point.country, point.lat, point.lon) : recommended;
    return {
        model,
        freezingModel: MODELS_WITH_FREEZING_LEVEL.has(model)
            ? null
            : inEurope ? EUROPE_FREEZING_MODEL : DEFAULT_FREEZING_MODEL,
        isCountryModel: model !== recommended,
    };
}

/** Open-Meteo calls one Resort or Saved location costs: one per elevation, plus one for a separate freezing level. */
export function resortCallWeight(resortId: string): number {
    const point = forecastPointOf(resortId);
    return (point?.elevations.length ?? 3) + (planFor(resortId, point).freezingModel ? 1 : 0);
}

/**
 * The Forecast model a forecast came from. Forecasts cached before they recorded it
 * all came from the Recommended card model.
 */
export function forecastModelOf(resortId: string, data: ResortData): WeatherModel {
    return data.model ?? recommendedCardModel(forecastPointOf(resortId)?.country ?? '');
}

/** Whether a forecast came from the Card model this member of the Selection has now. */
export function isOnCardModel(resortId: string, data: ResortData): boolean {
    return forecastModelOf(resortId, data) === planFor(resortId, forecastPointOf(resortId)).model;
}

/**
 * Whether a forecast was fetched at the elevation this member of the Selection
 * has now. Only a Saved location's elevation can change.
 */
export function isForecastCurrent(resortId: string, data: ResortData): boolean {
    if (!isSavedLocationId(resortId)) return true;
    return getSavedLocation(resortId)?.elevation === data.mid.metadata.elevation;
}

/**
 * Splits resorts into request-sized groups that share a model, keeping the
 * given order as far as grouping allows.
 */
export function groupIntoRequests(resortIds: string[]): string[][] {
    const groups = new Map<string, string[]>();
    for (const id of resortIds) {
        const point = forecastPointOf(id);
        if (!point) continue;
        const plan = planFor(id, point);
        const key = `${plan.model}|${plan.freezingModel}`;
        const group = groups.get(key) ?? [];
        group.push(id);
        groups.set(key, group);
    }

    const requests: string[][] = [];
    for (const group of groups.values()) {
        for (let i = 0; i < group.length; i += RESORTS_PER_REQUEST) {
            requests.push(group.slice(i, i + RESORTS_PER_REQUEST));
        }
    }
    return requests;
}

// --- Processing ---

interface FreezingSeries {
    values: Float32Array;
    timeStart: number;
    interval: number;
}

function freezingSeriesOf(response: ApiResponse | undefined, variableIndex: number): FreezingSeries | null {
    const hourly = response?.hourly();
    const values = hourly?.variables(variableIndex)?.valuesArray();
    if (!hourly || !values) return null;
    return { values, timeStart: Number(hourly.time()), interval: hourly.interval() };
}

type Period = 'AM' | 'PM' | 'NIGHT';

interface HourData {
    wind_speed: number;
    wind_direction: number;
    temperature: number;
    humidity: number;
    precipitation: number;
    weather_code: number;
    surface_pressure: number;
    rain: number;
    snowfall: number;
}

const periodOf = (hour: number): Period => hour < 12 ? 'AM' : (hour < 18 ? 'PM' : 'NIGHT');

const offsetFormatters = new Map<string, Intl.DateTimeFormat | null>();

/** The time zone's UTC offset in seconds at `epochSeconds`, or null for a zone this browser doesn't know. */
function utcOffsetAt(timeZone: string, epochSeconds: number): number | null {
    let formatter = offsetFormatters.get(timeZone);
    if (formatter === undefined) {
        try {
            formatter = new Intl.DateTimeFormat('en-US', {
                timeZone, hourCycle: 'h23',
                year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
            });
        } catch {
            formatter = null;
        }
        offsetFormatters.set(timeZone, formatter);
    }
    if (!formatter) return null;
    const part = (parts: Intl.DateTimeFormatPart[], type: string) => Number(parts.find(p => p.type === type)?.value);
    const parts = formatter.formatToParts(new Date(epochSeconds * 1000));
    const wallClockAsUtc = Date.UTC(part(parts, 'year'), part(parts, 'month') - 1, part(parts, 'day'),
        part(parts, 'hour'), part(parts, 'minute'), part(parts, 'second')) / 1000;
    return wallClockAsUtc - epochSeconds;
}

/**
 * The local wall-clock time of an hour of the forecast, as a Date to read with getUTC*.
 * The response carries the UTC offset of its first hour only; when clocks change before
 * the last hour (a daylight-saving switch), the hours from the switch on take the new offset.
 */
function localClockOf(response: ApiResponse, firstHour: number, lastHour: number): (epochSeconds: number) => Date {
    const startOffset = response.utcOffsetSeconds();
    const timeZone = response.timezone();
    const endOffset = timeZone ? utcOffsetAt(timeZone, lastHour) : null;
    if (!timeZone || endOffset === null || endOffset === startOffset) {
        return (t) => new Date((t + startOffset) * 1000);
    }

    // Find the first hour on the new offset
    let before = firstHour;
    let after = lastHour;
    while (after - before > 3600) {
        const middle = before + Math.floor((after - before) / 7200) * 3600;
        if (utcOffsetAt(timeZone, middle) === startOffset) before = middle;
        else after = middle;
    }
    return (t) => new Date((t + (t < after ? startOffset : endOffset)) * 1000);
}

/** Processes a single location's hourly data into AM/PM/NIGHT periods per local date. */
function processLocation(mainResp: ApiResponse | undefined, freezing: FreezingSeries | null): Record<string, DayData> | null {
    const hourly = mainResp?.hourly();
    if (!mainResp || !hourly) {
        console.warn('Skipping location: missing response or hourly data');
        return null;
    }

    const windSpeed = hourly.variables(0)!.valuesArray()!;
    const windDir = hourly.variables(1)!.valuesArray()!;
    const temp = hourly.variables(2)!.valuesArray()!;
    const hum = hourly.variables(3)!.valuesArray()!;
    const precip = hourly.variables(4)!.valuesArray()!;
    const code = hourly.variables(5)!.valuesArray()!;
    const pressure = hourly.variables(6)!.valuesArray()!;
    const rain = hourly.variables(7)!.valuesArray()!;
    const snowfall = hourly.variables(8)!.valuesArray()!;

    // --- Aggregation Loop ---
    const dailyChunks: Record<string, Record<Period, { hourly: HourData[]; freezingData: number[] }>> = {};
    const startTime = Number(hourly.time());
    const interval = hourly.interval();
    const length = (Number(hourly.timeEnd()) - startTime) / interval;
    const localTime = localClockOf(mainResp, startTime, startTime + (length - 1) * interval);

    // Group Hourly Data
    for (let i = 0; i < length; i++) {
        // Hours past the model's range come back as NaN: leave them out, or their periods would read as zeros
        if (!Number.isFinite(temp[i])) continue;

        const dateObj = localTime(startTime + i * interval);
        const dateKey = dateObj.toISOString().split('T')[0];

        if (!dailyChunks[dateKey]) {
            dailyChunks[dateKey] = {
                AM: { hourly: [], freezingData: [] },
                PM: { hourly: [], freezingData: [] },
                NIGHT: { hourly: [], freezingData: [] }
            };
        }

        dailyChunks[dateKey][periodOf(dateObj.getUTCHours())].hourly.push({
            wind_speed: windSpeed[i],
            wind_direction: windDir[i],
            temperature: temp[i],
            humidity: hum[i],
            precipitation: precip[i],
            weather_code: code[i],
            surface_pressure: pressure[i],
            rain: rain[i],
            snowfall: snowfall[i]
        });
    }

    // Group Freezing Data (Hourly)
    if (freezing) {
        for (let i = 0; i < freezing.values.length; i++) {
            const dateObj = localTime(freezing.timeStart + i * freezing.interval);
            const dateKey = dateObj.toISOString().split('T')[0];
            if (dailyChunks[dateKey] && Number.isFinite(freezing.values[i])) {
                dailyChunks[dateKey][periodOf(dateObj.getUTCHours())].freezingData.push(freezing.values[i]);
            }
        }
    }

    // Ranking from worst to best: rain -> sleet/mix -> wet_snow -> dry_snow -> powder
    const qualityRank: Record<SnowQuality, number> = {
        'rain': 0, 'sleet/mix': 1, 'wet_snow': 2, 'dry_snow': 3, 'powder': 4
    };

    const forecast: Record<string, DayData> = {};

    for (const [date, chunks] of Object.entries(dailyChunks)) {
        const day = {} as DayData;
        for (const chunkName of ['AM', 'PM', 'NIGHT'] as const) {
            const hData = chunks[chunkName].hourly;
            const fData = chunks[chunkName].freezingData;

            if (!hData.length) {
                day[chunkName] = null;
                continue;
            }

            // Calculate snow estimates from hourly data
            let totalSnowEstimateCm = 0;
            const ratios: number[] = [];
            const qualities: SnowQuality[] = [];

            for (const hourData of hData) {
                const estimate = estimateHourlySnow(hourData.temperature, hourData.humidity, hourData.snowfall);
                totalSnowEstimateCm += estimate.snowCm;
                if (estimate.ratio > 0) {
                    ratios.push(estimate.ratio);
                }
                // Only track quality for hours with precipitation
                if (hourData.precipitation > 0) {
                    qualities.push(estimate.quality);
                }
            }

            // Determine worst snow quality for the period (from hours with precip)
            let worstQuality: SnowQuality | null = null;
            for (const q of qualities) {
                if (worstQuality === null || qualityRank[q] < qualityRank[worstQuality]) {
                    worstQuality = q;
                }
            }

            // Average ratio (only from hours with snow)
            const avgRatio = ratios.length > 0 ? getAverage(ratios) : 0;

            const period: PeriodData = {
                temperature_max: fixed(getMax(hData.map(d => d.temperature)), 2),
                temperature_min: fixed(getMin(hData.map(d => d.temperature)), 2),
                temperature_avg: fixed(getAverage(hData.map(d => d.temperature)), 2),
                temperature_median: fixed(getMedian(hData.map(d => d.temperature)), 2),
                wind_speed: fixed(getAverage(hData.map(d => d.wind_speed)), 2),
                wind_direction: fixed(Math.round(getMode(hData.map(d => d.wind_direction))), 0), // Direction stays integer (degrees)
                relative_humidity: fixed(getAverage(hData.map(d => d.humidity)), 2),
                precipitation_total: fixed(getSum(hData.map(d => d.precipitation)), 4),
                rain_total: fixed(getSum(hData.map(d => d.rain)), 4),
                snowfall_total: fixed(getSum(hData.map(d => d.snowfall)), 4),
                weather_code: fixed(getMode(hData.map(d => d.weather_code)), 0),
                surface_pressure: fixed(getAverage(hData.map(d => d.surface_pressure)), 2),
                freezing_level: fData.length > 0 ? fixed(getMax(fData), 2) : null,
                // Snow estimation fields
                snowfall_estimate: fixed(totalSnowEstimateCm, 4),
                snow_to_liquid_ratio: fixed(avgRatio, 2),
                snow_quality: worstQuality as SnowQuality,
            };
            day[chunkName] = period;
        }
        forecast[date] = day;
    }

    return forecast;
}

/**
 * Fetches one request group from groupIntoRequests(): all three Elevation bands
 * for each resort, or the one elevation of a Saved location, spent against the
 * Fetch budget. Resorts whose data comes back incomplete are left out.
 *
 * Where a Country model turns out to have no data, those resorts are fetched again
 * from their Recommended card model, and remembered so later fetches go straight there.
 */
export async function fetchResortForecasts(
    resortIds: string[],
    priority: FetchPriority,
    signal?: AbortSignal
): Promise<Record<string, ResortData>> {
    const resorts = resortIds.flatMap(id => {
        const point = forecastPointOf(id);
        return point ? [{ id, point }] : [];
    });
    if (resorts.length === 0) return {};

    const plan = planFor(resorts[0].id, resorts[0].point);
    let result: Record<string, ResortData>;
    try {
        result = await fetchGroup(resorts, plan, priority, signal);
    } catch (error) {
        // Open-Meteo refuses the whole request when the model has no data at any one point
        // in it, and Coverage boxes are drawn generously: halve the group until it's found
        if (!plan.isCountryModel || !isNoDataError(error)) throw error;
        if (resorts.length === 1) {
            markGap(plan.model, resorts[0].id);
            return fetchResortForecasts([resorts[0].id], priority, signal);
        }
        const ids = resorts.map(r => r.id);
        const half = Math.ceil(ids.length / 2);
        const [first, second] = await Promise.all([
            fetchResortForecasts(ids.slice(0, half), priority, signal),
            fetchResortForecasts(ids.slice(half), priority, signal),
        ]);
        return { ...first, ...second };
    }

    // Nothing but empty hours means no data there either
    if (plan.isCountryModel) {
        const empty = resorts.map(r => r.id).filter(id => result[id] && Object.keys(result[id].mid.forecast).length === 0);
        empty.forEach(id => markGap(plan.model, id));
        // Their Recommended card models may differ (a Country model can be chosen in several countries)
        for (const group of groupIntoRequests(empty)) {
            Object.assign(result, await fetchResortForecasts(group, priority, signal));
        }
    }
    return result;
}

async function fetchGroup(
    resorts: { id: string; point: ForecastPoint }[],
    { model, freezingModel }: RequestPlan,
    priority: FetchPriority,
    signal?: AbortSignal
): Promise<Record<string, ResortData>> {
    const lats = resorts.map(r => r.point.lat);
    const lons = resorts.map(r => r.point.lon);

    const mainParams = {
        // One location per elevation: Bot, Mid and Top for a Resort, one for a Saved location
        latitude: resorts.flatMap(r => r.point.elevations.map(() => r.point.lat)),
        longitude: resorts.flatMap(r => r.point.elevations.map(() => r.point.lon)),
        elevation: resorts.flatMap(r => r.point.elevations),
        hourly: freezingModel ? MAIN_VARIABLES : [...MAIN_VARIABLES, 'freezing_level_height'],
        models: model,
        forecast_days: FORECAST_DAYS,
        timezone: 'auto',
    };

    const [mainResponses, freezingResponses] = await Promise.all([
        fetchWeatherApiWithinBudget(mainParams, priority, signal),
        freezingModel
            ? fetchWeatherApiWithinBudget({
                latitude: lats,
                longitude: lons,
                models: freezingModel,
                hourly: ['freezing_level_height'],
                forecast_days: FORECAST_DAYS,
                timezone: 'auto',
            }, priority, signal)
            : Promise.resolve(null),
    ]);

    const fetchedAt = Date.now();
    const result: Record<string, ResortData> = {};
    let firstResponse = 0;

    resorts.forEach(({ id, point }, i) => {
        const { lat, lon, elevations } = point;
        const responses = mainResponses.slice(firstResponse, firstResponse + elevations.length);
        firstResponse += elevations.length;

        // One freezing level for every elevation. When it comes with the main
        // request, the middle one's (the mid band's) matches the location's own terrain best.
        const freezing = freezingResponses
            ? freezingSeriesOf(freezingResponses[i], 0)
            : freezingSeriesOf(responses[Math.floor(responses.length / 2)], FREEZING_LEVEL_INDEX);

        const bands: ElevationForecast[] = [];
        for (const [j, elevation] of elevations.entries()) {
            const forecast = processLocation(responses[j], freezing);
            if (!forecast) {
                console.warn(`Incomplete data for ${id}, skipping resort`);
                return;
            }
            bands.push({ metadata: { elevation, lat, lon }, forecast });
        }

        // A Saved location's one forecast stands in for all three bands
        const [bot, mid = bot, top = bot] = bands;
        result[id] = { bot, mid, top, fetchedAt, model };
    });

    return result;
}

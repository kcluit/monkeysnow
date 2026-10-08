/**
 * Fetches Resort forecasts from Open-Meteo and shapes them into ResortData:
 * three Elevation bands, each split into AM/PM/NIGHT periods with snow estimates.
 *
 * Ported from the old Express backend so forecasts keep exactly the shape and
 * numbers the backend used to serve. The one exception is freezing level in
 * GFS regions; see MODELS_WITH_FREEZING_LEVEL.
 */

import { RESORT_LOCATIONS } from '../data/resortLocations';
import { fetchWeatherApiWithinBudget, type FetchPriority } from './openMeteoBudget';
import type { DayData, PeriodData, ResortData, SnowQuality } from '../types';

type ApiResponse = Awaited<ReturnType<typeof fetchWeatherApiWithinBudget>>[number];

const FORECAST_DAYS = 10;

/** Resorts per request; 25 resorts x 3 Elevation bands = 75 locations. */
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

// --- Model selection ---

// Country-to-model mapping
const COUNTRY_MODELS: Record<string, string> = {
    'Canada': 'gem_seamless',
    'USA': 'gfs_seamless',
    'Japan': 'jma_seamless',
    // DWD ICON Seamless — Central Europe & Alps
    'Germany': 'dwd_icon_seamless',
    'Austria': 'dwd_icon_seamless',
    'Switzerland': 'dwd_icon_seamless',
    'Liechtenstein': 'dwd_icon_seamless',
    'Italy': 'dwd_icon_seamless',
    'Slovenia': 'dwd_icon_seamless',
    'France': 'dwd_icon_seamless',
    // MET Norway Nordic Seamless — Scandinavia & Nordics
    'Norway': 'metno_seamless',
    'Sweden': 'metno_seamless',
    'Finland': 'metno_seamless',
    'Iceland': 'metno_seamless',
    // DMI Seamless — Denmark & Greenland
    'Denmark': 'dmi_seamless',
};
const DEFAULT_MODEL = 'gfs_seamless';

// Country-to-freezing-level-model mapping
const FREEZING_LEVEL_MODELS: Record<string, string> = {
    'Germany': 'icon_seamless',
    'Austria': 'icon_seamless',
    'Switzerland': 'icon_seamless',
    'Liechtenstein': 'icon_seamless',
    'Italy': 'icon_seamless',
    'Slovenia': 'icon_seamless',
    'France': 'icon_seamless',
    'Norway': 'icon_seamless',
    'Sweden': 'icon_seamless',
    'Finland': 'icon_seamless',
    'Iceland': 'icon_seamless',
    'Denmark': 'icon_seamless',
};
const DEFAULT_FREEZING_MODEL = 'gfs_seamless';

/**
 * Main models whose freezing level is taken from the main request, saving a call per resort.
 * With an elevation set, Open-Meteo may pick a neighbouring grid cell: for GFS that moves
 * the freezing level by at most a few tens of metres, but for ICON in the Alps by up to
 * 400 m, so ICON keeps its own request at the resort's terrain elevation.
 */
const MODELS_WITH_FREEZING_LEVEL = new Set(['gfs_seamless']);

interface RequestPlan {
    model: string;
    freezingModel: string | null; // null when the main model provides the freezing level
}

function planFor(resortId: string): RequestPlan {
    const country = RESORT_LOCATIONS.get(resortId)?.country ?? '';
    const model = COUNTRY_MODELS[country] ?? DEFAULT_MODEL;
    return {
        model,
        freezingModel: MODELS_WITH_FREEZING_LEVEL.has(model)
            ? null
            : FREEZING_LEVEL_MODELS[country] ?? DEFAULT_FREEZING_MODEL,
    };
}

/** Open-Meteo calls one Resort costs: one per Elevation band, plus one for a separate freezing level. */
export function resortCallWeight(resortId: string): number {
    return planFor(resortId).freezingModel ? 4 : 3;
}

/**
 * Splits resorts into request-sized groups that share a model, keeping the
 * given order as far as grouping allows.
 */
export function groupIntoRequests(resortIds: string[]): string[][] {
    const groups = new Map<string, string[]>();
    for (const id of resortIds) {
        if (!RESORT_LOCATIONS.has(id)) continue;
        const plan = planFor(id);
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

/** Processes a single location's hourly data into AM/PM/NIGHT periods per local date. */
function processLocation(mainResp: ApiResponse | undefined, freezing: FreezingSeries | null): Record<string, DayData> | null {
    const hourly = mainResp?.hourly();
    if (!mainResp || !hourly) {
        console.warn('Skipping location: missing response or hourly data');
        return null;
    }
    const utcOffset = mainResp.utcOffsetSeconds();

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

    // Group Hourly Data
    for (let i = 0; i < length; i++) {
        const dateObj = new Date((startTime + i * interval + utcOffset) * 1000);
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
            const dateObj = new Date((freezing.timeStart + i * freezing.interval + utcOffset) * 1000);
            const dateKey = dateObj.toISOString().split('T')[0];
            if (dailyChunks[dateKey]) {
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
 * for each resort, spent against the Fetch budget. Resorts whose data comes back
 * incomplete are left out.
 */
export async function fetchResortForecasts(
    resortIds: string[],
    priority: FetchPriority,
    signal?: AbortSignal
): Promise<Record<string, ResortData>> {
    const resorts = resortIds.flatMap(id => {
        const location = RESORT_LOCATIONS.get(id);
        return location ? [{ id, location }] : [];
    });
    if (resorts.length === 0) return {};

    const { model, freezingModel } = planFor(resorts[0].id);
    const lats = resorts.map(r => r.location.loc[0]);
    const lons = resorts.map(r => r.location.loc[1]);

    const mainParams = {
        // 3 points per resort (Bot, Mid, Top)
        latitude: lats.flatMap(lat => [lat, lat, lat]),
        longitude: lons.flatMap(lon => [lon, lon, lon]),
        elevation: resorts.flatMap(r => [r.location.bot, r.location.mid, r.location.top]),
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

    resorts.forEach(({ id, location }, i) => {
        const [lat, lon] = location.loc;
        const respBot = mainResponses[i * 3];
        const respMid = mainResponses[i * 3 + 1];
        const respTop = mainResponses[i * 3 + 2];

        // One freezing level for all three bands. When it comes with the main
        // request, the mid band's matches the location's own terrain best.
        const freezing = freezingResponses
            ? freezingSeriesOf(freezingResponses[i], 0)
            : freezingSeriesOf(respMid, FREEZING_LEVEL_INDEX);

        const forecastBot = processLocation(respBot, freezing);
        const forecastMid = processLocation(respMid, freezing);
        const forecastTop = processLocation(respTop, freezing);

        if (!forecastBot || !forecastMid || !forecastTop) {
            console.warn(`Incomplete data for ${id}, skipping resort`);
            return;
        }

        result[id] = {
            bot: { metadata: { elevation: location.bot, lat, lon }, forecast: forecastBot },
            mid: { metadata: { elevation: location.mid, lat, lon }, forecast: forecastMid },
            top: { metadata: { elevation: location.top, lat, lon }, forecast: forecastTop },
            fetchedAt,
        };
    });

    return result;
}

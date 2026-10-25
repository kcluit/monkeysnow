import type {
    AllWeatherData,
    ElevationLevel,
    ProcessedResortData,
    DayForecast,
    Period,
    PeriodTime,
    SnowCondition,
    SnowTotals,
    PeriodData,
    DayData,
    TemperatureMetric,
    SnowfallEstimateMode,
    SnowCaution,
    SnowQuality,
    PeriodEstimate,
    UnitSystem
} from '../types';
import type { TranslationKey } from '../types/i18n';
import {
    formatTempWithRounding,
    formatSnow,
    formatRain,
    formatWind,
    formatElevation,
    formatFreezingLevel,
    showsRain,
    showsSnow
} from './unitConversion';
import { forecastModelOf } from './resortForecast';
import { DEFAULT_SNOW_CAUTION, addPrecipitation, dominantQuality, noPrecipitationByQuality, sumPrecipitationByQuality } from './snowQuality';
import { getModelInfo } from '../data/modelHierarchy';
import { formatLocale, translate } from '../locales';

/** The Snowfall estimate a visitor starts with: the monkeysnow estimate */
export const DEFAULT_SNOWFALL_ESTIMATE_MODE: SnowfallEstimateMode = 'totalPrecip';

export function processResortData(
    allData: AllWeatherData,
    resortName: string,
    elevation: ElevationLevel = 'bot',
    temperatureMetric: TemperatureMetric = 'max',
    snowfallEstimateMode: SnowfallEstimateMode = DEFAULT_SNOWFALL_ESTIMATE_MODE,
    unitSystem: UnitSystem = 'metric',
    snowCaution: SnowCaution = DEFAULT_SNOW_CAUTION
): ProcessedResortData | null {
    try {
        if (!allData || !allData.data) {
            console.warn('Missing weather data');
            return null;
        }

        const resortData = allData.data[resortName];
        if (!resortData) {
            console.warn(`Resort data not found for ${resortName}`);
            return null;
        }

        const elevationData = resortData[elevation];
        if (!elevationData || !elevationData.forecast) {
            console.warn(`Elevation data not found for ${resortName} at ${elevation}`);
            return null;
        }

        const days: DayForecast[] = [];

        // Get sorted date keys from the forecast
        const dateKeys = Object.keys(elevationData.forecast).sort();

        for (const dateKey of dateKeys) {
            const dayData = elevationData.forecast[dateKey];
            if (!dayData) continue;

            // Create periods from AM/PM/NIGHT data
            const periods = createPeriodsFromDayData(dayData, temperatureMetric, snowfallEstimateMode, unitSystem, snowCaution);

            // Skip days with no meaningful forecast data (API returned zeros beyond model range)
            if (periods.length === 0 || periods.every(p => p.tempMax === 0 && p.tempMin === 0 && p.tempAvg === 0 && p.tempMedian === 0)) continue;

            const snowCondition = getSnowConditionFromQuality(dayQualityOf(dayData, periods, snowfallEstimateMode, unitSystem, snowCaution));

            // Get the highest freezing level from all periods
            const freezingLevels = [
                dayData.AM?.freezing_level,
                dayData.PM?.freezing_level,
                dayData.NIGHT?.freezing_level
            ].filter((level): level is number => typeof level === 'number' && !isNaN(level));
            const highestFreezingLevel = freezingLevels.length > 0 ? Math.max(...freezingLevels) : null;

            // The day's weather (and its emoji) is its PM Period's, else Night's, else AM's
            const mainWeatherCode = dayData.PM?.weather_code ?? dayData.NIGHT?.weather_code ?? dayData.AM?.weather_code ?? 0;

            // Words and dates are getters, in the language shown when they're read (see types/index.ts)
            days.push({
                dateKey,
                get name() { return weekdayName(dateKey); },
                get date() { return shortDate(dateKey); },
                weatherCode: mainWeatherCode,
                get weather() { return getWeatherDescription(mainWeatherCode); },
                weatherEmoji: getWeatherEmoji(mainWeatherCode),
                periods,
                freezingLevel: formatFreezingLevel(highestFreezingLevel, unitSystem),
                snowCondition
            });
        }

        if (days.length === 0) {
            console.warn(`No forecast days found for ${resortName}`);
            return null;
        }

        const model = forecastModelOf(resortName, resortData);
        return {
            id: resortName,
            name: resortName.replace(/-/g, ' '),
            elevation: formatElevation(elevationData.metadata.elevation, unitSystem),
            days,
            fetchedAt: resortData.fetchedAt,
            get model() { return getModelInfo(model)?.label ?? model; },
            isHistory: allData.historyLength !== undefined,
        };
    } catch (err) {
        console.error(`Error processing resort data for ${resortName}:`, err);
        return null;
    }
}

function createPeriodsFromDayData(dayData: DayData, temperatureMetric: TemperatureMetric, snowfallEstimateMode: SnowfallEstimateMode, unitSystem: UnitSystem, snowCaution: SnowCaution): Period[] {
    const periods: Period[] = [];

    const periodOrder: Array<{ key: keyof DayData; time: PeriodTime }> = [
        { key: 'AM', time: 'AM' },
        { key: 'PM', time: 'PM' },
        { key: 'NIGHT', time: 'Night' }
    ];

    for (const { key, time } of periodOrder) {
        const periodData = dayData[key];
        if (periodData) {
            periods.push(createPeriodFromData(periodData, time, temperatureMetric, snowfallEstimateMode, unitSystem, snowCaution));
        }
    }

    return periods;
}

function getTemperatureByMetric(data: PeriodData, metric: TemperatureMetric): number {
    switch (metric) {
        case 'max':
            return data.temperature_max ?? 0;
        case 'min':
            return data.temperature_min ?? 0;
        case 'avg':
            return data.temperature_avg ?? 0;
        case 'median':
            return data.temperature_median ?? 0;
        default:
            return data.temperature_max ?? 0;
    }
}

function createPeriodFromData(data: PeriodData, time: PeriodTime, temperatureMetric: TemperatureMetric, snowfallEstimateMode: SnowfallEstimateMode, unitSystem: UnitSystem, snowCaution: SnowCaution): Period {
    const displayTemp = getTemperatureByMetric(data, temperatureMetric);
    // Determine rounding mode based on metric
    const roundingMode = temperatureMetric === 'max' ? 'ceil' as const
        : temperatureMetric === 'min' ? 'floor' as const
            : 'round' as const;

    // A Period with no precipitation has no Snow quality and shows zeros for both
    const estimate = periodEstimateOf(data, snowCaution);
    const snowQuality = estimate.snow_quality;
    let snowValue = 0;
    let rainValue = 0;
    if (snowQuality !== null) {
        if (snowfallEstimateMode === 'model') {
            // The Model estimate: the model's own snowfall, else everything that fell as rain (its rain leaves out showers)
            const modelSnow = data.snowfall_total ?? 0;
            if (modelSnow > 0) snowValue = modelSnow;
            else rainValue = data.precipitation_total ?? 0;
        } else {
            // The monkeysnow estimate: the Period's precipitation split by each hour's wet bulb, so a Sleet/Mix Period shows both
            snowValue = estimate.snowfall_estimate;
            rainValue = estimate.rain_estimate;
        }
    }

    // In Model mode, the model's snow in a Period monkeysnow reckons is Rain is a mix
    const effectiveQuality = (snowfallEstimateMode === 'model' && snowQuality === 'rain' && snowValue > 0)
        ? 'sleet/mix' as SnowQuality
        : snowQuality;

    const weatherCode = data.weather_code ?? 0;
    return {
        time,
        temp: formatTempWithRounding(displayTemp, unitSystem, roundingMode),
        tempMax: data.temperature_max ?? 0,
        tempMin: data.temperature_min ?? 0,
        tempAvg: data.temperature_avg ?? 0,
        tempMedian: data.temperature_median ?? 0,
        get snow() { return formatSnow(snowValue, unitSystem); },
        get rain() { return formatRain(rainValue, unitSystem); },
        wind: formatWind(data.wind_speed ?? 0, unitSystem),
        snowCm: snowValue,
        rainMm: rainValue,
        windKmh: data.wind_speed ?? 0,
        weatherCode,
        get condition() { return getWeatherDescription(weatherCode); },
        snowQuality: effectiveQuality,
        freezingLevel: formatFreezingLevel(data.freezing_level, unitSystem)
    };
}

/** Each WMO weather code's words, and its emoji by the kind of weather: snow, rain or drizzle, clear, cloud, fog or thunder */
const WEATHER: Record<number, { key: TranslationKey; emoji: string }> = {
    0: { key: 'weather.clearSky', emoji: '☀️' },
    1: { key: 'weather.mainlyClear', emoji: '☀️' },
    2: { key: 'weather.partlyCloudy', emoji: '☁️' },
    3: { key: 'weather.overcast', emoji: '☁️' },
    45: { key: 'weather.foggy', emoji: '🌫️' },
    48: { key: 'weather.rimeFog', emoji: '🌫️' },
    51: { key: 'weather.lightDrizzle', emoji: '🌧️' },
    53: { key: 'weather.moderateDrizzle', emoji: '🌧️' },
    55: { key: 'weather.denseDrizzle', emoji: '🌧️' },
    56: { key: 'weather.lightFreezingDrizzle', emoji: '🌧️' },
    57: { key: 'weather.denseFreezingDrizzle', emoji: '🌧️' },
    61: { key: 'weather.slightRain', emoji: '🌧️' },
    63: { key: 'weather.moderateRain', emoji: '🌧️' },
    65: { key: 'weather.heavyRain', emoji: '🌧️' },
    66: { key: 'weather.lightFreezingRain', emoji: '🌧️' },
    67: { key: 'weather.heavyFreezingRain', emoji: '🌧️' },
    71: { key: 'weather.slightSnow', emoji: '❄️' },
    73: { key: 'weather.moderateSnow', emoji: '❄️' },
    75: { key: 'weather.heavySnow', emoji: '❄️' },
    77: { key: 'weather.snowGrains', emoji: '❄️' },
    80: { key: 'weather.slightRainShowers', emoji: '🌧️' },
    81: { key: 'weather.moderateRainShowers', emoji: '🌧️' },
    82: { key: 'weather.violentRainShowers', emoji: '🌧️' },
    85: { key: 'weather.slightSnowShowers', emoji: '❄️' },
    86: { key: 'weather.heavySnowShowers', emoji: '❄️' },
    95: { key: 'weather.thunderstorm', emoji: '⛈️' },
    96: { key: 'weather.thunderstormSlightHail', emoji: '⛈️' },
    99: { key: 'weather.thunderstormHeavyHail', emoji: '⛈️' },
};

/** A WMO weather code in words, in the language shown */
export function getWeatherDescription(code: number): string {
    return translate(WEATHER[code]?.key ?? 'weather.unknown');
}

/** A WMO weather code's emoji */
export function getWeatherEmoji(code: number): string {
    return WEATHER[code]?.emoji ?? '⛅';
}

// A day's Snow quality as the Default view's cards head it
const SNOW_CONDITIONS: Record<SnowQuality, { key: TranslationKey; isHighlight: boolean }> = {
    powder: { key: 'card.snowCondition.powder', isHighlight: true },
    dry_snow: { key: 'card.snowCondition.drySnow', isHighlight: true },
    wet_snow: { key: 'card.snowCondition.wetSnow', isHighlight: false },
    'sleet/mix': { key: 'snowQuality.sleetMix', isHighlight: false },
    rain: { key: 'snowQuality.rain', isHighlight: false },
};

/**
 * Maps snow quality from API to display text and whether it is highlighted
 */
export function getSnowConditionFromQuality(quality: SnowQuality | null): SnowCondition {
    if (quality === null) {
        return { get text() { return translate('card.snowCondition.none'); }, isHighlight: false, isSecondary: true };
    }
    const { key, isHighlight }: { key: TranslationKey; isHighlight: boolean } =
        SNOW_CONDITIONS[quality] ?? { key: 'card.snowCondition.mixed', isHighlight: false };
    return { get text() { return translate(key); }, isHighlight };
}

interface DayFormats {
    weekday: Intl.DateTimeFormat;
    date: Intl.DateTimeFormat;
}

const dayFormats = new Map<string, DayFormats>();

// A forecast day's date key is read as UTC midnight, so it is written in UTC to stay that date
function dayFormatsFor(locale: string): DayFormats {
    let formats = dayFormats.get(locale);
    if (!formats) {
        formats = {
            weekday: new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }),
            date: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        };
        dayFormats.set(locale, formats);
    }
    return formats;
}

/** "Saturday" for "2026-10-24", capitalised as a card's heading, since French writes "samedi" */
function weekdayName(dateKey: string): string {
    const locale = formatLocale();
    const name = dayFormatsFor(locale).weekday.format(new Date(dateKey));
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
}

/** "Oct 24", or "24 oct." in French */
function shortDate(dateKey: string): string {
    return dayFormatsFor(formatLocale()).date.format(new Date(dateKey));
}

/**
 * A Period's estimate under a Snow caution. One cached under an earlier SNOW_ESTIMATE_VERSION has
 * only Cautious's, shown under every caution until it is refetched; one cached before the tally by
 * Snow quality was kept counts all of its precipitation under its label.
 */
function periodEstimateOf(data: PeriodData, snowCaution: SnowCaution): PeriodEstimate {
    const estimate = data.estimates?.[snowCaution];
    if (estimate) return estimate;
    const snowQuality = data.snow_quality ?? null;
    const byQuality = data.precipitation_by_quality ?? noPrecipitationByQuality();
    if (!data.precipitation_by_quality && snowQuality) addPrecipitation(byQuality, snowQuality, data.precipitation_total ?? 0);
    return {
        snowfall_estimate: data.snowfall_estimate ?? 0,
        rain_estimate: data.rain_estimate ?? 0,
        precipitation_by_quality: byQuality,
        snow_quality: snowQuality,
    };
}

/**
 * The day's Snow quality, by the same rule as a Period's over all of the day's hours: the one
 * under which most of its precipitation fell, the worst of the tied on a tie. A day whose
 * Periods all show nothing has none, and in Model mode a Rain day the model gives snow for
 * is a mix, as a Period is.
 */
function dayQualityOf(dayData: DayData, periods: Period[], snowfallEstimateMode: SnowfallEstimateMode, unitSystem: UnitSystem, snowCaution: SnowCaution): SnowQuality | null {
    if (!periods.some(p => showsSnow(p.snowCm, unitSystem) || showsRain(p.rainMm, unitSystem))) return null;
    const byQuality = sumPrecipitationByQuality(
        [dayData.AM, dayData.PM, dayData.NIGHT].map(data => data ? periodEstimateOf(data, snowCaution).precipitation_by_quality : undefined)
    );
    const quality = dominantQuality(byQuality);
    if (snowfallEstimateMode === 'model' && quality === 'rain' && periods.some(p => p.snowCm > 0)) return 'sleet/mix';
    return quality;
}

/** A card's days nearest today first: the forecast's as they are, History's from today back */
export function daysFromToday(resort: ProcessedResortData): DayForecast[] {
    return resort.isHistory ? [...resort.days].reverse() : resort.days;
}

export function calculateSnowTotals(resort: ProcessedResortData | null): SnowTotals {
    if (!resort || !resort.days) return { threeDays: 0, sevenDays: 0 };

    const days = daysFromToday(resort);
    const threeDays = days.slice(0, 3);
    const sevenDays = days.slice(0, 7);

    // In cm, which formatSnow converts for display
    const calculate = (days: DayForecast[]): number => {
        return days.reduce((total, day) => {
            const dayTotal = day.periods.reduce((daySum, period) => daySum + period.snowCm, 0);
            return total + dayTotal;
        }, 0);
    };

    return {
        threeDays: Math.round(calculate(threeDays)),
        sevenDays: Math.round(calculate(sevenDays))
    };
}

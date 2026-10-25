import type {
    AllWeatherData,
    ElevationLevel,
    ProcessedResortData,
    DayForecast,
    Period,
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
import {
    formatTempWithRounding,
    formatSnow,
    formatRain,
    formatWind,
    formatElevation,
    formatFreezingLevel
} from './unitConversion';
import { forecastModelOf } from './resortForecast';
import { DEFAULT_SNOW_CAUTION, addPrecipitation, dominantQuality, noPrecipitationByQuality, sumPrecipitationByQuality } from './snowQuality';
import { getModelInfo } from '../data/modelHierarchy';

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
        const daysInWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Get sorted date keys from the forecast
        const dateKeys = Object.keys(elevationData.forecast).sort();

        for (const dateKey of dateKeys) {
            const dayData = elevationData.forecast[dateKey];
            if (!dayData) continue;

            const date = new Date(dateKey);
            // Use getUTCDay() to match the forecast date key (which is parsed as UTC)
            const dayName = daysInWeek[date.getUTCDay()];
            // Format date as "Jan 25" for optional display
            const dateDisplay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

            // Create periods from AM/PM/NIGHT data
            const periods = createPeriodsFromDayData(dayData, temperatureMetric, snowfallEstimateMode, unitSystem, snowCaution);

            // Skip days with no meaningful forecast data (API returned zeros beyond model range)
            if (periods.length === 0 || periods.every(p => p.tempMax === 0 && p.tempMin === 0 && p.tempAvg === 0 && p.tempMedian === 0)) continue;

            const snowCondition = getSnowConditionFromQuality(dayQualityOf(dayData, periods, snowfallEstimateMode, snowCaution));

            // Get the highest freezing level from all periods
            const freezingLevels = [
                dayData.AM?.freezing_level,
                dayData.PM?.freezing_level,
                dayData.NIGHT?.freezing_level
            ].filter((level): level is number => typeof level === 'number' && !isNaN(level));
            const highestFreezingLevel = freezingLevels.length > 0 ? Math.max(...freezingLevels) : null;

            // The day's weather (and its emoji) is its PM Period's, else Night's, else AM's
            const mainWeatherCode = dayData.PM?.weather_code ?? dayData.NIGHT?.weather_code ?? dayData.AM?.weather_code ?? 0;
            const mainCondition = getWeatherDescription(mainWeatherCode);

            days.push({
                name: dayName,
                date: dateDisplay,
                weather: mainCondition,
                weatherEmoji: getWeatherEmoji(mainCondition),
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
            model: getModelInfo(model)?.label ?? model,
            isHistory: allData.historyLength !== undefined,
        };
    } catch (err) {
        console.error(`Error processing resort data for ${resortName}:`, err);
        return null;
    }
}

function createPeriodsFromDayData(dayData: DayData, temperatureMetric: TemperatureMetric, snowfallEstimateMode: SnowfallEstimateMode, unitSystem: UnitSystem, snowCaution: SnowCaution): Period[] {
    const periods: Period[] = [];

    const periodOrder: Array<{ key: keyof DayData; label: string }> = [
        { key: 'AM', label: 'AM' },
        { key: 'PM', label: 'PM' },
        { key: 'NIGHT', label: 'Night' }
    ];

    for (const { key, label } of periodOrder) {
        const periodData = dayData[key];
        if (periodData) {
            periods.push(createPeriodFromData(periodData, label, temperatureMetric, snowfallEstimateMode, unitSystem, snowCaution));
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

function createPeriodFromData(data: PeriodData, label: string, temperatureMetric: TemperatureMetric, snowfallEstimateMode: SnowfallEstimateMode, unitSystem: UnitSystem, snowCaution: SnowCaution): Period {
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

    return {
        time: label,
        temp: formatTempWithRounding(displayTemp, unitSystem, roundingMode),
        tempMax: data.temperature_max ?? 0,
        tempMin: data.temperature_min ?? 0,
        tempAvg: data.temperature_avg ?? 0,
        tempMedian: data.temperature_median ?? 0,
        snow: formatSnow(snowValue, unitSystem),
        rain: formatRain(rainValue, unitSystem),
        wind: formatWind(data.wind_speed ?? 0, unitSystem),
        snowCm: snowValue,
        rainMm: rainValue,
        windKmh: data.wind_speed ?? 0,
        condition: getWeatherDescription(data.weather_code ?? 0),
        snowQuality: effectiveQuality,
        freezingLevel: formatFreezingLevel(data.freezing_level, unitSystem)
    };
}

// WMO Weather Code to description mapping
export function getWeatherDescription(code: number): string {
    const descriptions: Record<number, string> = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        56: 'Light freezing drizzle',
        57: 'Dense freezing drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Light freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    };
    return descriptions[code] || 'Unknown';
}

export function getWeatherEmoji(condition: string): string {
    if (!condition) return '⛅';
    const lowerCondition = condition.toLowerCase();

    if (lowerCondition.includes('snow')) return '❄️';
    if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) return '🌧️';
    if (lowerCondition.includes('clear')) return '☀️';
    if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) return '☁️';
    if (lowerCondition.includes('fog')) return '🌫️';
    if (lowerCondition.includes('thunder')) return '⛈️';
    return '⛅';
}

/**
 * Maps snow quality from API to display text and whether it is highlighted
 */
export function getSnowConditionFromQuality(quality: SnowQuality | null): SnowCondition {
    if (quality === null) {
        return { text: 'N/A', isHighlight: false, isSecondary: true };
    }
    switch (quality) {
        case 'powder':
            return { text: 'Powder!', isHighlight: true };
        case 'dry_snow':
            return { text: 'Dry Snow', isHighlight: true };
        case 'wet_snow':
            return { text: 'Wet Snow', isHighlight: false };
        case 'sleet/mix':
            return { text: 'Sleet/Mix', isHighlight: false };
        case 'rain':
            return { text: 'Rain', isHighlight: false };
        default:
            return { text: 'Mixed conditions', isHighlight: false };
    }
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
function dayQualityOf(dayData: DayData, periods: Period[], snowfallEstimateMode: SnowfallEstimateMode, snowCaution: SnowCaution): SnowQuality | null {
    if (!periods.some(p => parseFloat(p.snow) > 0 || parseFloat(p.rain) > 0)) return null;
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

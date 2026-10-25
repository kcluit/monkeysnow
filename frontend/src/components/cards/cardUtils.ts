import type { DayForecast, Period, PeriodTime, DayStats, ProcessedResortData, TemperatureMetric, UnitSystem } from '../../types';
import type { TranslationKey } from '../../types/i18n';
import { translate } from '../../locales';
import { formatSnow, formatTempWithRounding } from '../../utils/unitConversion';
import { calculateSnowTotals, getWeatherDescription } from '../../utils/weather';

const PERIOD_NAMES: Record<PeriodTime, TranslationKey> = { AM: 'period.am', PM: 'period.pm', Night: 'period.night' };

/** A Period's name in the language shown: "AM", or "Matin" */
export function periodName(time: PeriodTime): string {
    return translate(PERIOD_NAMES[time]);
}

/**
 * A day's weather in words, one for each of its AM and PM Periods when they differ,
 * else its PM's, else its first Period's
 */
export function dayWeatherTexts(periods: Period[]): string[] {
    if (!periods || periods.length === 0) return [translate('card.noData')];

    const amPeriod = periods.find(p => p.time === 'AM');
    const pmPeriod = periods.find(p => p.time === 'PM');

    if (amPeriod && pmPeriod) {
        if (amPeriod.weatherCode === pmPeriod.weatherCode) {
            return [amPeriod.condition];
        }
        return [amPeriod.condition, pmPeriod.condition];
    } else if (pmPeriod) {
        return [pmPeriod.condition];
    }

    return [periods[0].condition];
}

/**
 * Formats weather text from periods (combines AM/PM conditions intelligently)
 */
export function formatWeatherText(periods: Period[]): string {
    return dayWeatherTexts(periods).join(' / ');
}

// Each WMO weather code's words without intensity; codes left out are short enough already
const SHORT_WEATHER: Record<number, TranslationKey> = {
    0: 'weather.short.clear',
    1: 'weather.short.mostlyClear',
    2: 'weather.short.partlyCloudy',
    45: 'weather.short.fog',
    48: 'weather.short.rimeFog',
    51: 'weather.short.drizzle',
    53: 'weather.short.drizzle',
    55: 'weather.short.drizzle',
    56: 'weather.short.freezingDrizzle',
    57: 'weather.short.freezingDrizzle',
    61: 'weather.short.rain',
    63: 'weather.short.rain',
    65: 'weather.short.rain',
    66: 'weather.short.freezingRain',
    67: 'weather.short.freezingRain',
    71: 'weather.short.snow',
    73: 'weather.short.snow',
    75: 'weather.short.snow',
    80: 'weather.short.showers',
    81: 'weather.short.showers',
    82: 'weather.short.showers',
    85: 'weather.short.snowShowers',
    86: 'weather.short.snowShowers',
    95: 'weather.short.storm',
    96: 'weather.short.stormHail',
    99: 'weather.short.stormHail',
};

/**
 * A WMO weather code's words, short enough for a narrow column by dropping intensity
 * ("Light drizzle" and "Dense drizzle" are both "Drizzle"): the snow and rain amounts show intensity.
 */
export function shortWeatherText(weatherCode: number): string {
    const key = SHORT_WEATHER[weatherCode];
    return key ? translate(key) : getWeatherDescription(weatherCode);
}

/** "Next 3 Days: 12.0 cm | Next 7 Days: 31.0 cm", or History's latest days */
export function totalsText(resort: ProcessedResortData, unitSystem: UnitSystem): string {
    const totals = calculateSnowTotals(resort);
    const [threeDays, sevenDays]: TranslationKey[] = resort.isHistory
        ? ['card.past3Days', 'card.past7Days']
        : ['card.next3Days', 'card.next7Days'];
    return `${translate(threeDays, { amount: formatSnow(totals.threeDays, unitSystem) })} | ${translate(sevenDays, { amount: formatSnow(totals.sevenDays, unitSystem) })}`;
}

/**
 * Calculates aggregated day statistics based on temperature metric.
 * For max: returns max of all period maxes (true daily max)
 * For min: returns min of all period mins (true daily min)
 * For avg: returns average of all period averages
 * For median: returns average of all period medians
 *
 * Snow, rain and wind stay metric (cm, mm, km/h) for formatSnow, formatRain and formatWind
 * to convert once; the temperature is converted before it is rounded, as the periods' are.
 */
export function calculateDayStats(day: DayForecast, temperatureMetric: TemperatureMetric = 'max', unitSystem: UnitSystem = 'metric'): DayStats {
    const periods = day.periods;
    if (!periods.length) return { maxTemp: 0, temp: formatTempWithRounding(0, unitSystem, 'round'), snow: 0, rain: 0, wind: 0 };

    let aggregatedTemp = 0;

    // PM wind, or the first period's when there is no PM
    const wind = (periods.find(p => p.time === 'PM') ?? periods[0]).windKmh;

    // Calculate temperature based on metric
    switch (temperatureMetric) {
        case 'max':
            // Max of all period maxes (true daily maximum)
            aggregatedTemp = Math.max(...periods.map(p => p.tempMax));
            break;
        case 'min':
            // Min of all period mins (true daily minimum)
            aggregatedTemp = Math.min(...periods.map(p => p.tempMin));
            break;
        case 'avg':
            // Average of all period averages
            aggregatedTemp = periods.reduce((sum, p) => sum + p.tempAvg, 0) / periods.length;
            break;
        case 'median':
            // Average of all period medians
            aggregatedTemp = periods.reduce((sum, p) => sum + p.tempMedian, 0) / periods.length;
            break;
        default:
            aggregatedTemp = Math.max(...periods.map(p => p.tempMax));
    }

    // Round based on metric: ceil for max, floor for min, round for avg/median
    const rounding = temperatureMetric === 'max' ? 'ceil' as const
        : temperatureMetric === 'min' ? 'floor' as const
            : 'round' as const;
    const roundedTemp = rounding === 'ceil' ? Math.ceil(aggregatedTemp)
        : rounding === 'floor' ? Math.floor(aggregatedTemp)
            : Math.round(aggregatedTemp);

    return {
        maxTemp: roundedTemp,
        temp: formatTempWithRounding(aggregatedTemp, unitSystem, rounding),
        snow: periods.reduce((sum, period) => sum + period.snowCm, 0),
        rain: periods.reduce((sum, period) => sum + period.rainMm, 0),
        wind
    };
}

/**
 * Linear interpolation helper
 */
function lerp(start: number, end: number, t: number): number {
    return start * (1 - t) + end * t;
}

/**
 * Gets temperature color style based on value.
 * Returns an object with either a className (for ≤0°C) or inline style (for >0°C gradient).
 */
export function getTemperatureStyle(temp: number): { className?: string; style?: { color: string } } {
    if (temp <= 0) {
        // For freezing/below zero temperatures, use accent color
        return { className: 'text-theme-accent font-semibold' };
    } else {
        // For above zero temperatures, use an exponential color transition
        // Colors: Blue (#007AFF) -> Yellow (#FFD60A) -> Orange (#FF9F0A) -> Red (#FF3B30)
        const t = Math.pow(temp / 10, 2); // Exponential curve
        let color: { r: number; g: number; b: number };

        if (t <= 0.09) { // 0-3°C: Blue to Yellow
            const normalizedT = t / 0.09;
            color = {
                r: Math.round(lerp(0, 255, normalizedT)),
                g: Math.round(lerp(122, 214, normalizedT)),
                b: Math.round(lerp(255, 10, normalizedT))
            };
        } else if (t <= 0.25) { // 3-5°C: Yellow to Orange
            const normalizedT = (t - 0.09) / 0.16;
            color = {
                r: 255,
                g: Math.round(lerp(214, 159, normalizedT)),
                b: 10
            };
        } else { // 5-10°C: Orange to Red
            const normalizedT = (t - 0.25) / 0.75;
            color = {
                r: 255,
                g: Math.round(lerp(159, 59, normalizedT)),
                b: Math.round(lerp(10, 48, normalizedT))
            };
        }

        return { style: { color: `rgb(${color.r}, ${color.g}, ${color.b})` } };
    }
}

/**
 * Gets snow amount color class (the theme's highlight colours for significant amounts).
 * Thresholds are based on cm values: 20cm+ special colour, 10cm+ title colour.
 */
export function getSnowClass(snowCm: number): string {
    if (snowCm >= 20) return 'special-color-text';
    if (snowCm >= 10) return 'title-color-text';
    return 'text-theme-accent';
}

/**
 * Gets wind color class (accent for high winds).
 * Threshold is based on km/h values: 20 km/h+ gets accent.
 */
export function getWindClass(windKmh: number): string {
    return windKmh >= 20 ? 'text-theme-accent' : 'text-theme-textSecondary';
}

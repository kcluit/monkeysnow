import type { DayForecast, Period, DayStats, TemperatureMetric, UnitSystem } from '../../types';

// Conversion constants for back-converting imperial to metric for threshold checks
const INCHES_TO_CM = 2.54;
const MPH_TO_KMH = 1.609344;

/**
 * Formats weather text from periods (combines AM/PM conditions intelligently)
 */
export function formatWeatherText(periods: Period[]): string {
    if (!periods || periods.length === 0) return 'No data';

    const amPeriod = periods.find(p => p.time === 'AM');
    const pmPeriod = periods.find(p => p.time === 'PM');

    if (amPeriod && pmPeriod) {
        if (amPeriod.condition === pmPeriod.condition) {
            return amPeriod.condition;
        }
        return `${amPeriod.condition} / ${pmPeriod.condition}`;
    } else if (pmPeriod) {
        return pmPeriod.condition;
    } else if (periods.length === 1) {
        return periods[0].condition;
    }

    return periods[0].condition;
}

/**
 * Calculates aggregated day statistics based on temperature metric.
 * For max: returns max of all period maxes (true daily max)
 * For min: returns min of all period mins (true daily min)
 * For avg: returns average of all period averages
 * For median: returns average of all period medians
 *
 * Note: Returns values in the current unit system (parsed from formatted strings).
 * Temperature is from raw metric values, but snow/wind are parsed from formatted strings.
 */
export function calculateDayStats(day: DayForecast, temperatureMetric: TemperatureMetric = 'max'): DayStats {
    const periods = day.periods;
    if (!periods.length) return { maxTemp: 0, snow: 0, rain: 0, wind: 0 };

    let aggregatedTemp = 0;
    let totalSnow = 0;
    let totalRain = 0;

    // Get PM wind or fallback to available wind
    let wind = 0;
    const pmPeriod = periods.find(p => p.time === 'PM');
    if (pmPeriod) {
        wind = parseFloat(pmPeriod.wind.replace(/[^\d.-]/g, '')) || 0;
    } else if (periods.length > 0) {
        wind = parseFloat(periods[0].wind.replace(/[^\d.-]/g, '')) || 0;
    }

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

    periods.forEach(period => {
        const snowAmount = parseFloat(period.snow.replace(/[^\d.-]/g, '')) || 0;
        totalSnow += snowAmount;

        const rainAmount = parseFloat(period.rain.replace(/[^\d.-]/g, '')) || 0;
        totalRain += rainAmount;
    });

    // Round based on metric: ceil for max, floor for min, round for avg/median
    const roundedTemp = temperatureMetric === 'max' ? Math.ceil(aggregatedTemp)
        : temperatureMetric === 'min' ? Math.floor(aggregatedTemp)
            : Math.round(aggregatedTemp);

    return {
        maxTemp: roundedTemp,
        snow: Math.round(totalSnow * 10) / 10,
        rain: Math.round(totalRain * 10) / 10,
        wind: Math.round(wind)
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
 * Gets temperature color class based on value (legacy, for backwards compatibility)
 * @deprecated Use getTemperatureStyle instead for gradient support
 */
export function getTemperatureClass(temp: number): string {
    if (temp <= 0) return 'text-theme-accent font-semibold';
    if (temp <= 5) return 'text-green-600 font-semibold';
    if (temp <= 10) return 'text-orange-500 font-semibold';
    return 'text-red-500 font-semibold';
}

/**
 * Gets snow amount color class (rainbow for significant amounts).
 * Thresholds are based on cm values: 20cm+ rainbow, 10cm+ apple-rainbow.
 * When in imperial mode, converts inches back to cm for threshold comparison.
 */
export function getSnowClass(snow: number, unitSystem: UnitSystem = 'metric'): string {
    // Convert to metric for threshold comparison if needed
    const snowCm = unitSystem === 'imperial' ? snow * INCHES_TO_CM : snow;
    if (snowCm >= 20) return 'rainbow-text';
    if (snowCm >= 10) return 'apple-rainbow-text';
    return 'text-theme-accent';
}

/**
 * Gets wind color class (accent for high winds).
 * Threshold is based on km/h values: 20 km/h+ gets accent.
 * When in imperial mode, converts mph back to km/h for threshold comparison.
 */
export function getWindClass(wind: number, unitSystem: UnitSystem = 'metric'): string {
    // Convert to metric for threshold comparison if needed
    const windKmh = unitSystem === 'imperial' ? wind * MPH_TO_KMH : wind;
    return windKmh >= 20 ? 'text-theme-accent' : 'text-theme-textSecondary';
}

import type { DayForecast, Period, DayStats, TemperatureMetric } from '../../types';

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
 */
export function calculateDayStats(day: DayForecast, temperatureMetric: TemperatureMetric = 'max'): DayStats {
    const periods = day.periods;
    if (!periods.length) return { maxTemp: 0, snow: 0, wind: 0 };

    let aggregatedTemp = 0;
    let totalSnow = 0;

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
        const snowAmount = parseFloat(period.snow.replace(' cm', '')) || 0;
        totalSnow += snowAmount;
    });

    // Round based on metric: ceil for max, floor for min, round for avg/median
    const roundedTemp = temperatureMetric === 'max' ? Math.ceil(aggregatedTemp)
                      : temperatureMetric === 'min' ? Math.floor(aggregatedTemp)
                      : Math.round(aggregatedTemp);

    return {
        maxTemp: roundedTemp,
        snow: Math.round(totalSnow * 10) / 10,
        wind: Math.round(wind)
    };
}

/**
 * Gets temperature color class based on value
 */
export function getTemperatureClass(temp: number): string {
    if (temp <= 0) return 'text-blue-600 font-semibold';
    if (temp <= 5) return 'text-green-600 font-semibold';
    if (temp <= 10) return 'text-orange-500 font-semibold';
    return 'text-red-500 font-semibold';
}

/**
 * Gets snow amount color class (rainbow for significant amounts)
 */
export function getSnowClass(snow: number): string {
    if (snow >= 20) return 'rainbow-text';
    if (snow >= 10) return 'apple-rainbow-text';
    return 'text-theme-accent';
}

/**
 * Gets wind color class (accent for high winds)
 */
export function getWindClass(wind: number): string {
    return wind >= 20 ? 'text-theme-accent' : 'text-theme-textSecondary';
}

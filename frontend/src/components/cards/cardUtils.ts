import type { DayForecast, Period, DayStats } from '../../types';

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
 * Calculates aggregated day statistics (max temp, total snow, PM wind)
 */
export function calculateDayStats(day: DayForecast): DayStats {
    const periods = day.periods;
    if (!periods.length) return { maxTemp: 0, snow: 0, wind: 0 };

    let maxTemp = -Infinity;
    let totalSnow = 0;

    // Get PM wind or fallback to available wind
    let wind = 0;
    const pmPeriod = periods.find(p => p.time === 'PM');
    if (pmPeriod) {
        wind = parseFloat(pmPeriod.wind.replace(' km/h', '')) || 0;
    } else if (periods.length > 0) {
        wind = parseFloat(periods[0].wind.replace(' km/h', '')) || 0;
    }

    periods.forEach(period => {
        const temp = parseFloat(period.temp.replace('°C', '')) || 0;
        maxTemp = Math.max(maxTemp, temp);

        const snowAmount = parseFloat(period.snow.replace(' cm', '')) || 0;
        totalSnow += snowAmount;
    });

    return {
        maxTemp: Math.round(maxTemp * 10) / 10,
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

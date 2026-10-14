/**
 * Snow quality and the monkeysnow estimate: what an hour's precipitation falls as, and how
 * much snow it makes, from the air's temperature and humidity at the height being forecast.
 * Each Elevation band's wet bulb decides, never the model's own snowfall, which is its grid
 * cell's and the same for every band on it (docs/adr/0011).
 *
 * Snow quality is cautious: when an hour is close, it leans toward the worse label.
 */

import type { SnowQuality } from '../types';

/** Every Snow quality from worst to best; an HourlyForecast stores each hour's as its index here */
export const SNOW_QUALITIES: readonly SnowQuality[] = ['rain', 'sleet/mix', 'wet_snow', 'dry_snow', 'powder'];

/**
 * Bumped whenever the estimate changes, so a forecast cached under an earlier one counts as
 * stale and is refetched, instead of showing labels and amounts these rules would not give.
 */
export const SNOW_ESTIMATE_VERSION = 3;

/** Rain from this wet bulb (°C) up, where snow is less likely than 3 in 4 */
export const RAIN_FROM = 0.5;
/** Sleet/Mix from this wet bulb (°C) up to RAIN_FROM; below it snow is likelier than 19 in 20 */
export const MIX_FROM = -0.5;

/** Wet snow has a snow-to-liquid ratio under this, Dry snow from it up */
export const DRY_SNOW_FROM_RATIO = 10;
/** Powder has a snow-to-liquid ratio of this or more */
export const POWDER_FROM_RATIO = 15;

/** Saturation vapour pressure over water, hPa, by Bolton's (1980) formula */
function saturationVapourPressure(tempC: number): number {
    return 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
}

/** The standard atmosphere's pressure at a height, hPa, for hours a model gives no surface pressure */
export function standardPressureAt(elevationM: number): number {
    return 1013.25 * Math.pow(1 - 2.25577e-5 * elevationM, 5.25588);
}

/** An hour's surface pressure, or the standard atmosphere's at the height being forecast where the model has none */
export function surfacePressureOr(pressureHpa: number, elevationM: number): number {
    return Number.isFinite(pressureHpa) && pressureHpa > 0 ? pressureHpa : standardPressureAt(elevationM);
}

/**
 * The wet-bulb temperature, °C: how cold the air would get if water evaporated into it until it
 * was saturated. Solved from the psychrometric equation over water at the hour's surface pressure,
 * because the same air has a colder wet bulb the lower the pressure: at resort heights a few
 * tenths of a degree in humid air and over a degree in dry air, which a sea-level fit misses.
 */
export function wetBulbOf(tempC: number, humidity: number, pressureHpa: number): number {
    const rh = Math.max(0, Math.min(100, humidity));
    const vapourPressure = (rh / 100) * saturationVapourPressure(tempC);
    // e = e_s(Tw) - A * P * (T - Tw), A being the psychrometric coefficient of a ventilated wet bulb
    // over water. The right side rises with Tw, so bisect between the coldest it could be and the air
    let low = tempC - 60;
    let high = tempC;
    for (let i = 0; i < 32; i++) {
        const mid = (low + high) / 2;
        const coefficient = 6.6e-4 * (1 + 0.00115 * mid);
        if (saturationVapourPressure(mid) - coefficient * pressureHpa * (tempC - mid) > vapourPressure) high = mid;
        else low = mid;
    }
    return (low + high) / 2;
}

/**
 * The share of an hour's precipitation that falls as snow: all of it below MIX_FROM, none
 * from RAIN_FROM up, and a straight line between, so the label and the amount can't disagree.
 */
export function snowFractionOf(wetBulbC: number): number {
    if (wetBulbC <= MIX_FROM) return 1;
    if (wetBulbC >= RAIN_FROM) return 0;
    return (RAIN_FROM - wetBulbC) / (RAIN_FROM - MIX_FROM);
}

/** The ratio line's corners, [wet bulb °C, ratio], coldest first; flat beyond each end */
const RATIO_LINE: readonly (readonly [number, number])[] = [[-25, 12], [-18, 17], [-14, 17], [-0.5, 8]];

/**
 * Snow-to-liquid ratio, cm of snow per cm of water, at a wet bulb: 8 at -0.5 °C and warmer,
 * rising straight to 17 at -14, flat to -18, falling straight to 12 at -25 and colder, where
 * crystals go small. One line, kept on the low side of fresh-snow climatologies.
 */
export function snowToLiquidRatioOf(wetBulbC: number): number {
    const coldest = RATIO_LINE[0];
    const warmest = RATIO_LINE[RATIO_LINE.length - 1];
    if (wetBulbC <= coldest[0]) return coldest[1];
    if (wetBulbC >= warmest[0]) return warmest[1];
    for (let i = 1; i < RATIO_LINE.length; i++) {
        const [t0, r0] = RATIO_LINE[i - 1];
        const [t1, r1] = RATIO_LINE[i];
        if (wetBulbC <= t1) return r0 + (r1 - r0) * (wetBulbC - t0) / (t1 - t0);
    }
    return warmest[1];
}

/**
 * An hour's Snow quality from its wet bulb: Rain and Sleet/Mix by the two lines above, and
 * the snow labels by how fluffy the snow is, Wet snow under a ratio of 10, Dry snow from
 * 10 to 15, Powder at 15 and up. On the ratio line that is Wet snow from -0.5 °C to about
 * -3.5, Dry snow to -11, Powder to about -21, and Dry snow again in the bitter cold.
 */
export function snowQualityOf(wetBulbC: number): SnowQuality {
    if (wetBulbC >= RAIN_FROM) return 'rain';
    if (wetBulbC >= MIX_FROM) return 'sleet/mix';
    const ratio = snowToLiquidRatioOf(wetBulbC);
    if (ratio >= POWDER_FROM_RATIO) return 'powder';
    if (ratio >= DRY_SNOW_FROM_RATIO) return 'dry_snow';
    return 'wet_snow';
}

/** monkeysnow's estimate for one hour */
export interface HourlySnowEstimate {
    wetBulb: number;
    quality: SnowQuality;
    /** cm of snow made by the hour's precipitation */
    snowCm: number;
    /** mm of the hour's precipitation that fell as rain */
    rainMm: number;
}

/** Splits an hour's total precipitation (mm of water) into snow and rain by its wet bulb at the hour's surface pressure. */
export function estimateHour(tempC: number, humidity: number, precipitationMm: number, pressureHpa: number): HourlySnowEstimate {
    const wetBulb = wetBulbOf(tempC, humidity, pressureHpa);
    const fell = Number.isFinite(precipitationMm) && precipitationMm > 0 ? precipitationMm : 0;
    const snowWaterMm = fell * snowFractionOf(wetBulb);
    return {
        wetBulb,
        quality: snowQualityOf(wetBulb),
        snowCm: snowWaterMm * snowToLiquidRatioOf(wetBulb) / 10,
        rainMm: fell - snowWaterMm,
    };
}

/** mm of precipitation that fell under each Snow quality, in SNOW_QUALITIES order */
export function noPrecipitationByQuality(): number[] {
    return SNOW_QUALITIES.map(() => 0);
}

/** Counts an hour's precipitation under its Snow quality. */
export function addPrecipitation(byQuality: number[], quality: SnowQuality, mm: number): void {
    if (Number.isFinite(mm) && mm > 0) byQuality[SNOW_QUALITIES.indexOf(quality)] += mm;
}

/** Adds up several stretches' precipitation by Snow quality, such as a day's Periods. */
export function sumPrecipitationByQuality(parts: readonly (readonly number[] | undefined)[]): number[] {
    const total = noPrecipitationByQuality();
    for (const part of parts) part?.forEach((mm, i) => { total[i] += mm; });
    return total;
}

/** Sums within this many mm of each other count as tied, so 0.1 + 0.2 ties 0.3 */
const TIE_MM = 1e-6;

/**
 * The Snow quality of a stretch of hours, a Period or a day: the one under which most of
 * its precipitation fell, the worst of the tied on a tie, and null when nothing fell.
 */
export function dominantQuality(byQuality: readonly number[]): SnowQuality | null {
    let dominant: SnowQuality | null = null;
    let most = 0;
    SNOW_QUALITIES.forEach((quality, i) => {
        const mm = byQuality[i] ?? 0;
        // Strictly more keeps the worse label on a tie, since the list runs worst to best
        if (mm > 0 && mm > most + TIE_MM) {
            dominant = quality;
            most = mm;
        }
    });
    return dominant;
}

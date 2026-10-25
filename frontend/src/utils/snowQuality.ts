/**
 * Snow quality and the monkeysnow estimate: what an hour's precipitation falls as, and how
 * much snow it makes, from the air's temperature and humidity at the height being forecast.
 * Each Elevation band's wet bulb decides, never the model's own snowfall, which is its grid
 * cell's and the same for every band on it (docs/adr/0011).
 *
 * How far Snow quality leans toward the worse label when an hour is close is the visitor's
 * Snow caution (docs/adr/0013): Realistic follows the rain-snow studies, Cautious and Extra
 * cautious call Rain sooner, and Extra cautious makes denser snow too.
 */

import type { SnowCaution, SnowQuality } from '../types';

/** Every Snow quality from worst to best; an HourlyForecast stores each hour's as its index here */
export const SNOW_QUALITIES: readonly SnowQuality[] = ['rain', 'sleet/mix', 'wet_snow', 'dry_snow', 'powder'];

/** Every Snow caution, the most cautious first */
export const SNOW_CAUTIONS: readonly SnowCaution[] = ['extraCautious', 'cautious', 'realistic'];

/** The Snow caution a visitor starts with */
export const DEFAULT_SNOW_CAUTION: SnowCaution = 'cautious';

/** One value for each Snow caution */
export function byCaution<T>(valueOf: (caution: SnowCaution) => T): Record<SnowCaution, T> {
    return { extraCautious: valueOf('extraCautious'), cautious: valueOf('cautious'), realistic: valueOf('realistic') };
}

/**
 * Bumped whenever the estimate changes, so a forecast cached under an earlier one counts as
 * stale and is refetched, instead of showing labels and amounts these rules would not give.
 */
export const SNOW_ESTIMATE_VERSION = 4;

/**
 * A Snow caution's two lines, wet bulbs in °C: Sleet/Mix from `mixFrom` up, Rain from `rainFrom`
 * up. Each comment gives how likely snow is at the two lines on Wang et al.'s (2019) curve,
 * 1 / (1 + 6.99e-5 * e^(2 (Tw + 3.97))), which is half snow at +0.8 °C.
 */
export const CAUTION_LINES: Record<SnowCaution, { mixFrom: number; rainFrom: number }> = {
    // 99% and 90%: Rain wherever there's even a 1 in 10 chance of it
    extraCautious: { mixFrom: -1.5, rainFrom: -0.3 },
    // 93% and 65%
    cautious: { mixFrom: -0.5, rainFrom: 0.5 },
    // 75% and 25%, so half snow at +0.8 °C, where the rain-snow studies put it in the mountains
    realistic: { mixFrom: 0.25, rainFrom: 1.35 },
};

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
 * The share of an hour's precipitation that falls as snow: all of it below the Snow caution's
 * Sleet/Mix line, none from its Rain line up, and a straight line between, so the label and the
 * amount can't disagree.
 */
export function snowFractionOf(wetBulbC: number, caution: SnowCaution): number {
    const { mixFrom, rainFrom } = CAUTION_LINES[caution];
    if (wetBulbC <= mixFrom) return 1;
    if (wetBulbC >= rainFrom) return 0;
    return (rainFrom - wetBulbC) / (rainFrom - mixFrom);
}

/** The ratio line's corners, [wet bulb °C, ratio], coldest first; flat beyond each end */
const RATIO_LINE: readonly (readonly [number, number])[] = [[-25, 12], [-18, 17], [-14, 17], [-0.5, 8]];

/**
 * Snow-to-liquid ratio, cm of snow per cm of water, at a wet bulb under a Snow caution. Extra
 * cautious takes the lower of the ratio line and LaChapelle's (1962) new-snow density at Alta,
 * 50 + 1.7 (T + 15)^1.5 kg/m³, which is denser near freezing (9.6 against the line's 11 at -5 °C);
 * from about -10 °C down the line is the lower, so cold snow can still be Powder.
 */
export function snowToLiquidRatioOf(wetBulbC: number, caution: SnowCaution): number {
    const ratio = ratioLineAt(wetBulbC);
    if (caution !== 'extraCautious') return ratio;
    return Math.min(ratio, 1000 / (50 + 1.7 * Math.pow(Math.max(0, wetBulbC + 15), 1.5)));
}

/**
 * The ratio line: 8 at -0.5 °C and warmer, rising straight to 17 at -14, flat to -18, falling
 * straight to 12 at -25 and colder, where crystals go small. From 0 to -14 °C it is within 0.5 of
 * the average of Hedstrom & Pomeroy's (1998) and LaChapelle's (1962) new-snow curves.
 */
function ratioLineAt(wetBulbC: number): number {
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
 * An hour's Snow quality from its wet bulb under a Snow caution: Rain and Sleet/Mix by its two
 * lines, and the snow labels by how fluffy the snow is, Wet snow under a ratio of 10, Dry snow
 * from 10 to 15, Powder at 15 and up. On the ratio line that is Wet snow down to about -3.5 °C,
 * Dry snow to -11, Powder to about -21, and Dry snow again in the bitter cold; Extra cautious's
 * Wet snow runs down to about -5.5 °C.
 */
export function snowQualityOf(wetBulbC: number, caution: SnowCaution): SnowQuality {
    const { mixFrom, rainFrom } = CAUTION_LINES[caution];
    if (wetBulbC >= rainFrom) return 'rain';
    if (wetBulbC >= mixFrom) return 'sleet/mix';
    const ratio = snowToLiquidRatioOf(wetBulbC, caution);
    if (ratio >= POWDER_FROM_RATIO) return 'powder';
    if (ratio >= DRY_SNOW_FROM_RATIO) return 'dry_snow';
    return 'wet_snow';
}

/** monkeysnow's estimate for one hour */
export interface HourlySnowEstimate {
    quality: SnowQuality;
    /** cm of snow made by the hour's precipitation */
    snowCm: number;
    /** mm of the hour's precipitation that fell as rain */
    rainMm: number;
}

/** Splits an hour's total precipitation (mm of water) into snow and rain by its wet bulb, under a Snow caution. */
export function splitHour(wetBulbC: number, precipitationMm: number, caution: SnowCaution): HourlySnowEstimate {
    const fell = Number.isFinite(precipitationMm) && precipitationMm > 0 ? precipitationMm : 0;
    const snowWaterMm = fell * snowFractionOf(wetBulbC, caution);
    return {
        quality: snowQualityOf(wetBulbC, caution),
        snowCm: snowWaterMm * snowToLiquidRatioOf(wetBulbC, caution) / 10,
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

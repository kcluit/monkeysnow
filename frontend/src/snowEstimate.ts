/**
 * Interface for the result of the snow estimation.
 * Returns both the estimated accumulation and the metadata used to calculate it.
 */
interface SnowEstimate {
    snowAccumulationCm: number; // The estimated snow depth in cm
    snowToLiquidRatio: number;  // The calculated ratio (e.g., 10 for 10:1)
    snowFraction: number;       // The percentage of precip contributing to accumulation (0.0 - 1.0)
    wetBulbTempC: number;       // The calculated wet bulb temperature
    precipitationType: 'rain' | 'sleet/mix' | 'wet_snow' | 'powder' | 'dry_snow';
}

/**
 * Calculates the Wet Bulb Temperature using the Stull (2011) approximation.
 * This is effective for standard surface pressures at sea level to moderate elevation.
 * * @param tempC - Dry bulb temperature in Celsius
 * @param rh - Relative humidity in percent (e.g., 50 for 50%)
 * @returns Wet bulb temperature in Celsius
 */
function calculateWetBulb(tempC: number, rh: number): number {
    // Clamp RH to valid range [0, 100] to prevent math errors
    const safeRh = Math.max(0, Math.min(100, rh));

    const term1 = tempC * Math.atan(0.151977 * Math.pow(safeRh + 8.313659, 0.5));
    const term2 = Math.atan(tempC + safeRh);
    const term3 = Math.atan(safeRh - 1.676331);
    const term4 = 0.00391838 * Math.pow(safeRh, 1.5) * Math.atan(0.023101 * safeRh);
    const term5 = 4.686035;

    return term1 + term2 - term3 + term4 - term5;
}

/**
 * Calculates the "Snow Fraction": What percentage of the precipitation 
 * actually contributes to accumulation?
 * * - Warm (> 0.5C WB): 0% Snow (All rain)
 * - Transition (-2.0C to 0.5C WB): 20% - 90% Snow (Slush/Mix)
 * - Cold (< -2.0C WB): 100% Snow
 */
function calculateSnowFraction(wetBulbC: number): number {
    // 1. Warm Zone: Pure Rain
    if (wetBulbC >= 0.5) return 0.0;

    // 2. Slush Zone: Mostly rain, very little sticking
    if (wetBulbC >= -0.5) return 0.1; // Only 10% counts as snow

    // 3. Transition Zone (-2.0C to -0.5C)
    // We linearly interpolate from 20% snow up to 100% snow.
    if (wetBulbC > -2.0) {
        // Math: slope = (y2 - y1) / (x2 - x1)
        // slope = (1.0 - 0.2) / (-2.0 - (-0.5)) = 0.8 / -1.5 = -0.533
        const slope = (1.0 - 0.2) / (-2.0 - (-0.5));
        const fraction = 0.2 + slope * (wetBulbC - (-0.5));
        return Math.min(1.0, Math.max(0.0, fraction));
    }

    // 4. Cold Zone: All Snow
    return 1.0;
}

/**
 * Determines the Snow-to-Liquid Ratio (SLR) based on Wet Bulb Temperature.
 * Adjusted to reflect crystal habits using the SAFEST LOWEST estimates:
 * - 0 to -4: Thin Plates (Wet) -> 3:1
 * - -4 to -10: Needles/Columns (Avg) -> 7:1
 * - -12 to -18: Dendrites (DGZ - Fluffy) -> 15:1
 * - < -20: Plates/Columns (Dense) -> 12:1
 * * @param wetBulbC - The wet bulb temperature in Celsius
 * @returns The Snow-to-Liquid Ratio (e.g., return 12 for a 12:1 ratio)
 */
function getKucheraRatio(wetBulbC: number): number {
    // 1. Warm/Rain Zone (handled by Snow Fraction, but ratio is low if it sticks)
    if (wetBulbC > 0) {
        return 3;
    }

    // 2. Thin Plates / Dendritic fragments (0 to -4)
    // Table Range: 3:1 to 7:1 -> Lowest: 3
    if (wetBulbC > -4) {
        return 3;
    }

    // 3. Needles / Columns (-4 to -10)
    // Table Range: 7:1 to 12:1 -> Lowest: 7
    if (wetBulbC > -10) {
        return 7;
    }

    // 4. Transition Zone (-10 to -12)
    // Gap in provided table. Interpolating conservatively between 7 and 15.
    if (wetBulbC > -12) {
        return 10;
    }

    // 5. Dendritic Growth Zone / Stellar Dendrites (-12 to -18)
    // Table Range: 15:1 to 30:1 -> Lowest: 15
    if (wetBulbC > -18) {
        return 15;
    }

    // 6. Cold / Plates & Columns (< -20 range)
    // Table Range: 12:1 to 18:1 -> Lowest: 12
    // Note: This covers the gap from -18 to -20 and everything below.
    return 12;
}

/**
 * Main function to estimate snowfall.
 * * @param tempC - Surface Temperature (Celsius)
 * @param rh - Relative Humidity (%)
 * @param precipMm - Total Liquid Equivalent Precipitation (mm)
 */
export function estimateSnowfall(
    tempC: number,
    rh: number,
    precipMm: number
): SnowEstimate {

    const wetBulb = calculateWetBulb(tempC, rh);
    const ratio = getKucheraRatio(wetBulb);
    const snowFraction = calculateSnowFraction(wetBulb);

    // Calculation: 
    // 1. Determine how much liquid is effectively snow (vs rain/slush runoff)
    const effectivePrecipMm = precipMm * snowFraction;

    // 2. Apply Ratio: Effective Precip (mm) * Ratio = Snow (mm). 
    // 3. Divide by 10 for cm.
    const snowMm = effectivePrecipMm * ratio;
    const snowCm = snowMm / 10;

    // Determine type string for metadata based on Wet Bulb Temp (Crystal Habit)
    let type: SnowEstimate['precipitationType'] = 'dry_snow';

    if (snowFraction === 0) {
        type = 'rain';
    } else if (snowFraction < 0.5) {
        type = 'sleet/mix';
    } else if (wetBulb > -4) {
        type = 'wet_snow'; // 0 to -4: Thin Plates/Wet
    } else if (wetBulb <= -12 && wetBulb >= -18) {
        type = 'powder';   // -12 to -18: DGZ/Fluffy
    }
    // Default 'dry_snow' applies to:
    // -4 to -12 (Needles/Columns/Transition)
    // < -18 (Cold Plates/Columns)

    return {
        snowAccumulationCm: Number(snowCm.toFixed(2)),
        snowToLiquidRatio: ratio,
        snowFraction: Number(snowFraction.toFixed(2)),
        wetBulbTempC: Number(wetBulb.toFixed(2)),
        precipitationType: type
    };
}

// --- Example Usage ---
// Scenario: -13C, 80% Humidity (Ideal DGZ temps), 10mm of liquid.
const currentConditions = {
    temp: -13,
    humidity: 80,
    precip: 10
};

const forecast = estimateSnowfall(
    currentConditions.temp,
    currentConditions.humidity,
    currentConditions.precip
);

console.log(`Forecast: ${forecast.snowAccumulationCm} cm of ${forecast.precipitationType}`);
console.log(`(Wet Bulb: ${forecast.wetBulbTempC}°C, Ratio: ${forecast.snowToLiquidRatio}:1, Fraction: ${forecast.snowFraction})`);
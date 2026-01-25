/**
 * Snow Estimation Module
 * * Uses Stull's Wet Bulb approximation and a Hybrid Lapse-Rate logic 
 * to estimate Snow-to-Liquid Ratios (SLR) from surface-only data.
 */

// --- Types ---

export interface WeatherInput {
    tempC: number;        // Surface Temperature in Celsius
    humidity: number;     // Relative Humidity (0-100)
    precipMm: number;     // Liquid Equivalent Precipitation in mm
}

export interface SnowEstimate {
    snowAccumulationCm: number; // Estimated snow depth in cm
    snowToLiquidRatio: number;  // The calculated ratio (e.g., 12 for 12:1)
    wetBulbTempC: number;       // Surface wet bulb temperature
    estimatedCloudTempC: number; // Estimated temperature at generation level
    precipitationType: 'rain' | 'sleet_mix' | 'wet_snow' | 'standard_snow' | 'powder';
}

// --- Math Helpers ---

/**
 * Calculates Wet Bulb Temperature using Stull (2011).
 * Accurate for standard surface pressures.
 */
function calculateWetBulb(tempC: number, rh: number): number {
    const safeRh = Math.max(0.1, Math.min(100, rh)); // Clamp RH to prevent math errors

    const term1 = tempC * Math.atan(0.151977 * Math.pow(safeRh + 8.313659, 0.5));
    const term2 = Math.atan(tempC + safeRh);
    const term3 = Math.atan(safeRh - 1.676331);
    const term4 = 0.00391838 * Math.pow(safeRh, 1.5) * Math.atan(0.023101 * safeRh);
    const term5 = 4.686035;

    return term1 + term2 - term3 + term4 - term5;
}

/**
 * Determines the Snow-to-Liquid Ratio (SLR) using the Hybrid Method.
 * * Logic:
 * 1. Surface Constraint: If surface wet bulb is warm, the snow melts/clumps (Low Ratio).
 * 2. Aloft Constraint: If surface is cold enough, we estimate cloud temp.
 * If cloud temp hits the Dendritic Growth Zone (-12C to -18C), we boost the ratio (High Ratio).
 */
function getHybridRatio(surfaceTempC: number, surfaceWetBulbC: number): number {
    // --- PHASE 1: The Melt Check (Surface Physics) ---

    // Rain barrier: If wet bulb is > 1.5C, it's likely rain.
    if (surfaceWetBulbC > 1.5) return 0;

    // Slush/Mix barrier: 0.5C to 1.5C
    if (surfaceWetBulbC > 0.5) return 3; // 3:1 ratio (slush)

    // Wet Snow ("Sierra Cement"): -1.0C to 0.5C
    if (surfaceWetBulbC > -1.0) return 6; // 6:1 ratio (very heavy)

    // Heavy Snow: -2.5C to -1.0C
    // Even if it's powder aloft, it gets heavy landing in this warm layer.
    if (surfaceWetBulbC > -2.5) return 9; // 9:1 ratio

    // --- PHASE 2: The Crystal Check (Cloud Physics) ---

    // If we passed the melt check (surface is < -2.5C), we look at crystal generation.
    // We estimate the precip is generating ~1500m above surface.
    // Lapse rate approx -6.5C/km => ~10C cooler than surface.
    const estimatedCloudTemp = surfaceTempC - 10;

    // Dendritic Growth Zone (-12C to -18C)
    // This is the "Goldilocks" zone for large branching crystals (max fluff).
    if (estimatedCloudTemp <= -12 && estimatedCloudTemp >= -18) {
        return 18; // 18:1 (Champagne Powder)
    }

    // Cold Column/Plate Zone (< -18C)
    // Crystals become smaller/denser again.
    if (estimatedCloudTemp < -18) {
        return 15; // 15:1 (Light but denser than dendrites)
    }

    // Standard Zone (Warmer than -12C aloft, but surface is < -2.5C)
    return 12; // 12:1 (Standard winter snow)
}

/**
 * Determines a descriptive label for the precipitation type
 */
function getPrecipType(ratio: number): SnowEstimate['precipitationType'] {
    if (ratio === 0) return 'rain';
    if (ratio < 6) return 'sleet_mix';
    if (ratio < 10) return 'wet_snow';
    if (ratio < 15) return 'standard_snow';
    return 'powder';
}

// --- Main Export ---

/**
 * Generates a snow accumulation forecast based on surface metrics.
 */
export function estimateSnowfall(input: WeatherInput): SnowEstimate {
    const { tempC, humidity, precipMm } = input;

    // 1. Calculate thermodynamics
    const wetBulb = calculateWetBulb(tempC, humidity);
    const estimatedCloudTemp = tempC - 10; // Heuristic offset

    // 2. Get the ratio
    const ratio = getHybridRatio(tempC, wetBulb);

    // 3. Calculate Accumulation
    // Formula: Liquid (mm) * Ratio = Snow (mm). Divide by 10 for cm.
    const snowMm = precipMm * ratio;
    const snowCm = parseFloat((snowMm / 10).toFixed(2));

    return {
        snowAccumulationCm: snowCm,
        snowToLiquidRatio: ratio,
        wetBulbTempC: parseFloat(wetBulb.toFixed(2)),
        estimatedCloudTempC: parseFloat(estimatedCloudTemp.toFixed(2)),
        precipitationType: getPrecipType(ratio),
    };
}

// --- Usage Example ---
// Uncomment to test:
/*
const forecast = estimateSnowfall({
  tempC: -3,       // Cold surface
  humidity: 90,    // High humidity
  precipMm: 15     // 15mm liquid incoming
});

console.log(forecast);
// Expected Result:
// Surface is -3C (Wet Bulb ~ -3.5C). 
// Cloud estimate is -13C (Dendritic Zone!).
// Result should be High Ratio (~18:1) -> ~27cm of Powder.
*/
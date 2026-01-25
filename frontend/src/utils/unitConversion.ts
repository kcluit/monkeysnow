/**
 * Unit conversion utilities for metric/imperial display.
 * All conversions are from metric (backend default) to imperial.
 */

export type UnitSystem = 'metric' | 'imperial';

// Conversion constants
const CM_TO_INCHES = 0.393701;
const MM_TO_INCHES = 0.0393701;
const KMH_TO_MPH = 0.621371;
const M_TO_FT = 3.28084;

/**
 * Convert temperature from Celsius and format with unit.
 */
export function formatTemp(celsius: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const fahrenheit = (celsius * 9) / 5 + 32;
    return `${Math.round(fahrenheit)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

/**
 * Convert temperature from Celsius with custom rounding and format with unit.
 */
export function formatTempWithRounding(
  celsius: number,
  system: UnitSystem,
  roundingMode: 'ceil' | 'floor' | 'round'
): string {
  const roundFn = roundingMode === 'ceil' ? Math.ceil : roundingMode === 'floor' ? Math.floor : Math.round;

  if (system === 'imperial') {
    const fahrenheit = (celsius * 9) / 5 + 32;
    return `${roundFn(fahrenheit)}°F`;
  }
  return `${roundFn(celsius)}°C`;
}

/**
 * Convert snow amount from cm and format with unit.
 */
export function formatSnow(cm: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const inches = cm * CM_TO_INCHES;
    return `${inches.toFixed(1)} in`;
  }
  return `${cm.toFixed(1)} cm`;
}

/**
 * Convert rain amount from mm and format with unit.
 */
export function formatRain(mm: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const inches = mm * MM_TO_INCHES;
    return `${inches.toFixed(1)} in`;
  }
  return `${mm.toFixed(1)} mm`;
}

/**
 * Convert wind speed from km/h and format with unit.
 */
export function formatWind(kmh: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const mph = Math.round(kmh * KMH_TO_MPH);
    return `${mph} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

/**
 * Convert elevation/height from meters and format with unit.
 */
export function formatElevation(meters: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const feet = Math.round(meters * M_TO_FT);
    return `${feet}ft`;
  }
  return `${Math.round(meters)}m`;
}

/**
 * Format freezing level (handles null case).
 */
export function formatFreezingLevel(meters: number | null, system: UnitSystem): string {
  if (meters === null || isNaN(meters)) {
    return system === 'imperial' ? '- ft' : '- m';
  }
  if (system === 'imperial') {
    const feet = Math.round(meters * M_TO_FT);
    return `${feet} ft`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Detect user's preferred unit system based on locale.
 * Returns 'imperial' for US users, 'metric' for others.
 */
export function detectDefaultUnitSystem(): UnitSystem {
  try {
    const locale = navigator.language || 'en-US';
    // US, Liberia, and Myanmar use imperial
    const imperialLocales = ['en-US', 'en-LR', 'my-MM'];

    for (const imperial of imperialLocales) {
      if (locale.toLowerCase().startsWith(imperial.toLowerCase())) {
        return 'imperial';
      }
    }

    // Also check just the country code
    const countryCode = locale.split('-')[1]?.toUpperCase();
    if (countryCode === 'US' || countryCode === 'LR' || countryCode === 'MM') {
      return 'imperial';
    }

    return 'metric';
  } catch {
    return 'metric';
  }
}

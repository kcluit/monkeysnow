/**
 * Unit conversion utilities for metric/imperial display.
 * All conversions are from metric (Open-Meteo default) to imperial.
 */

import { formatDecimal, withUnit } from '../locales';

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
 * Convert snow amount from cm and format with unit, written the language's way ("1.5 cm", "1,5 cm", "1,5 см").
 */
export function formatSnow(cm: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const inches = cm * CM_TO_INCHES;
    return withUnit(formatDecimal(inches, 1), 'in');
  }
  return withUnit(formatDecimal(cm, 1), 'cm');
}

/**
 * Convert rain amount from mm and format with unit, written the language's way.
 */
export function formatRain(mm: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const inches = mm * MM_TO_INCHES;
    return withUnit(formatDecimal(inches, 1), 'in');
  }
  return withUnit(formatDecimal(mm, 1), 'mm');
}

/** Whether formatSnow shows any snow, rather than "0.0 cm" */
export function showsSnow(cm: number, system: UnitSystem): boolean {
  return Number((system === 'imperial' ? cm * CM_TO_INCHES : cm).toFixed(1)) > 0;
}

/** Whether formatRain shows any rain, rather than "0.0 mm" */
export function showsRain(mm: number, system: UnitSystem): boolean {
  return Number((system === 'imperial' ? mm * MM_TO_INCHES : mm).toFixed(1)) > 0;
}

/**
 * Convert wind speed from km/h and format with unit.
 */
export function formatWind(kmh: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const mph = Math.round(kmh * KMH_TO_MPH);
    return withUnit(mph, 'mph');
  }
  return withUnit(Math.round(kmh), 'km/h');
}

/**
 * Convert elevation/height from meters and format with unit ("1500m", "1500 м").
 */
export function formatElevation(meters: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const feet = Math.round(meters * M_TO_FT);
    return withUnit(feet, 'ft', true);
  }
  return withUnit(Math.round(meters), 'm', true);
}

/** A height in metres as a whole number in the visitor's units, for typing over */
export function elevationInUnits(meters: number, system: UnitSystem): number {
  return Math.round(system === 'imperial' ? meters * M_TO_FT : meters);
}

/** A height typed in the visitor's units, in whole metres */
export function elevationFromUnits(value: number, system: UnitSystem): number {
  return Math.round(system === 'imperial' ? value / M_TO_FT : value);
}

/** The highest height a visitor can type, about 9000 m, in their units */
export function maxTypedElevation(system: UnitSystem): number {
  return system === 'imperial' ? 29528 : 9000;
}

/**
 * Format freezing level (handles null case).
 */
export function formatFreezingLevel(meters: number | null, system: UnitSystem): string {
  if (meters === null || isNaN(meters)) {
    return withUnit('-', system === 'imperial' ? 'ft' : 'm');
  }
  if (system === 'imperial') {
    const feet = Math.round(meters * M_TO_FT);
    return withUnit(feet, 'ft');
  }
  return withUnit(Math.round(meters), 'm');
}

/**
 * Returns the default unit system.
 * Always returns 'metric' as the site default.
 */
export function detectDefaultUnitSystem(): UnitSystem {
  return 'metric';
}

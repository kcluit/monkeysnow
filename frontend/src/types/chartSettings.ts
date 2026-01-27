/**
 * Chart Settings Types
 *
 * Type definitions for per-variable chart customization settings.
 * Settings are stored in localStorage with keys like `chartType_${variable}`.
 */

import type { WeatherVariable } from './openMeteo';

/** Available chart types for display */
export type ChartDisplayType = 'line' | 'bar' | 'area';

/** Variables that support accumulation overlay */
export const ACCUMULATION_VARIABLES: WeatherVariable[] = [
  'precipitation',
  'rain',
  'snowfall',
  'snow_depth',
];

/** Check if a variable supports accumulation overlay */
export function supportsAccumulation(variable: WeatherVariable): boolean {
  return ACCUMULATION_VARIABLES.includes(variable);
}

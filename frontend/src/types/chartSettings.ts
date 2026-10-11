/**
 * Chart Settings Types
 *
 * Type definitions for per-variable chart customization settings.
 * Settings are stored in localStorage with keys like `chartType_${variable}`.
 */

import type { WeatherVariable } from './openMeteo';

/** Available chart types for display */
export type ChartDisplayType = 'line' | 'bar' | 'area' | 'boxwhisker' | 'heatmap';

/** The gear modal's tabs: this chart's own settings, or the Model styles shared by every chart */
export type ChartSettingsTab = 'chart' | 'models';

/** Variables that support accumulation overlay: hourly amounts, whose running total means something */
export const ACCUMULATION_VARIABLES: WeatherVariable[] = [
  'precipitation',
  'rain',
  'showers',
  'snowfall',
  'sunshine_duration',
  'evapotranspiration',
  'et0_fao_evapotranspiration',
  'shortwave_radiation',
  'direct_radiation',
  'diffuse_radiation',
];

/** Check if a variable supports accumulation overlay */
export function supportsAccumulation(variable: WeatherVariable): boolean {
  return ACCUMULATION_VARIABLES.includes(variable);
}

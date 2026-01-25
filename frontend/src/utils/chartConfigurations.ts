import type { WeatherModel, WeatherVariable } from '../types/openMeteo';
import type { VariableConfig, ModelConfig } from '../types/detailView';
import type { UnitSystem } from './unitConversion';

// Weather model configurations
export const MODEL_CONFIGS: Map<WeatherModel, ModelConfig> = new Map([
  ['best_match', { id: 'best_match', name: 'Best Match', color: '#6366f1', description: 'Auto-selected best model for location' }],
  ['ecmwf_ifs', { id: 'ecmwf_ifs', name: 'ECMWF IFS', color: '#3b82f6', description: 'European Centre for Medium-Range Weather Forecasts' }],
  ['ecmwf_ifs025', { id: 'ecmwf_ifs025', name: 'ECMWF IFS 0.25', color: '#0ea5e9', description: 'ECMWF high resolution' }],
  ['icon_seamless', { id: 'icon_seamless', name: 'ICON Seamless', color: '#10b981', description: 'DWD ICON combined' }],
  ['icon_eu', { id: 'icon_eu', name: 'ICON EU', color: '#14b8a6', description: 'DWD ICON Europe' }],
  ['gfs_seamless', { id: 'gfs_seamless', name: 'GFS Seamless', color: '#f59e0b', description: 'NOAA GFS combined' }],
  ['gem_seamless', { id: 'gem_seamless', name: 'GEM Seamless', color: '#ef4444', description: 'Canadian GEM combined' }],
  ['gem_hrdps_continental', { id: 'gem_hrdps_continental', name: 'GEM HRDPS', color: '#dc2626', description: 'Canadian high-res regional' }],
  ['meteofrance_seamless', { id: 'meteofrance_seamless', name: 'MF Seamless', color: '#8b5cf6', description: 'Meteo-France combined' }],
  ['meteofrance_arpege_europe', { id: 'meteofrance_arpege_europe', name: 'MF ARPEGE', color: '#a855f7', description: 'Meteo-France ARPEGE Europe' }],
  ['metno_seamless', { id: 'metno_seamless', name: 'MetNo Seamless', color: '#ec4899', description: 'Norwegian MET combined' }],
  ['metno_nordic', { id: 'metno_nordic', name: 'MetNo Nordic', color: '#f472b6', description: 'Norwegian MET Nordic' }],
  ['knmi_seamless', { id: 'knmi_seamless', name: 'KNMI Seamless', color: '#84cc16', description: 'Dutch KNMI combined' }],
  ['ncep_nbm_conus', { id: 'ncep_nbm_conus', name: 'NBM CONUS', color: '#22c55e', description: 'NOAA National Blend of Models' }],
  ['meteoswiss_icon_ch2', { id: 'meteoswiss_icon_ch2', name: 'ICON CH2', color: '#06b6d4', description: 'MeteoSwiss ICON 2km' }],
  ['kma_gdps', { id: 'kma_gdps', name: 'KMA GDPS', color: '#78716c', description: 'Korea Meteorological Administration' }],
]);

// Helper to convert temperature from Celsius
const tempToImperial = (c: number): number => (c * 9) / 5 + 32;

// Helper to convert mm to inches
const mmToInches = (mm: number): number => mm / 25.4;

// Helper to convert cm to inches
const cmToInches = (cm: number): number => cm / 2.54;

// Helper to convert km/h to mph
const kmhToMph = (kmh: number): number => kmh / 1.609344;

// Helper to convert meters to feet
const mToFt = (m: number): number => m * 3.28084;

// Helper to convert hPa to inHg
const hpaToInHg = (hpa: number): number => hpa * 0.02953;

// Variable configurations
export const VARIABLE_CONFIGS: Map<WeatherVariable, VariableConfig> = new Map([
  ['temperature_2m', {
    id: 'temperature_2m',
    label: 'Temperature',
    unit: 'C',
    unitImperial: 'F',
    color: '#ef4444',
    chartType: 'line',
    formatValue: (v, u) => u === 'metric' ? `${Math.round(v)}C` : `${Math.round(tempToImperial(v))}F`,
    convertToImperial: tempToImperial,
  }],
  ['apparent_temperature', {
    id: 'apparent_temperature',
    label: 'Feels Like',
    unit: 'C',
    unitImperial: 'F',
    color: '#f97316',
    chartType: 'line',
    formatValue: (v, u) => u === 'metric' ? `${Math.round(v)}C` : `${Math.round(tempToImperial(v))}F`,
    convertToImperial: tempToImperial,
  }],
  ['precipitation', {
    id: 'precipitation',
    label: 'Precipitation',
    unit: 'mm',
    unitImperial: 'in',
    color: '#3b82f6',
    chartType: 'bar',
    formatValue: (v, u) => u === 'metric' ? `${v.toFixed(1)}mm` : `${mmToInches(v).toFixed(2)}in`,
    convertToImperial: mmToInches,
    yAxisDomain: [0, 'auto'],
  }],
  ['rain', {
    id: 'rain',
    label: 'Rain',
    unit: 'mm',
    unitImperial: 'in',
    color: '#0ea5e9',
    chartType: 'bar',
    formatValue: (v, u) => u === 'metric' ? `${v.toFixed(1)}mm` : `${mmToInches(v).toFixed(2)}in`,
    convertToImperial: mmToInches,
    yAxisDomain: [0, 'auto'],
  }],
  ['snowfall', {
    id: 'snowfall',
    label: 'Snowfall',
    unit: 'cm',
    unitImperial: 'in',
    color: '#06b6d4',
    chartType: 'bar',
    formatValue: (v, u) => u === 'metric' ? `${v.toFixed(1)}cm` : `${cmToInches(v).toFixed(1)}in`,
    convertToImperial: cmToInches,
    yAxisDomain: [0, 'auto'],
  }],
  ['snow_depth', {
    id: 'snow_depth',
    label: 'Snow Depth',
    unit: 'm',
    unitImperial: 'ft',
    color: '#22d3ee',
    chartType: 'area',
    formatValue: (v, u) => u === 'metric' ? `${v.toFixed(2)}m` : `${mToFt(v).toFixed(1)}ft`,
    convertToImperial: mToFt,
    yAxisDomain: [0, 'auto'],
  }],
  ['wind_speed_10m', {
    id: 'wind_speed_10m',
    label: 'Wind Speed',
    unit: 'km/h',
    unitImperial: 'mph',
    color: '#84cc16',
    chartType: 'line',
    formatValue: (v, u) => u === 'metric' ? `${Math.round(v)}km/h` : `${Math.round(kmhToMph(v))}mph`,
    convertToImperial: kmhToMph,
    yAxisDomain: [0, 'auto'],
  }],
  ['wind_gusts_10m', {
    id: 'wind_gusts_10m',
    label: 'Wind Gusts',
    unit: 'km/h',
    unitImperial: 'mph',
    color: '#eab308',
    chartType: 'line',
    formatValue: (v, u) => u === 'metric' ? `${Math.round(v)}km/h` : `${Math.round(kmhToMph(v))}mph`,
    convertToImperial: kmhToMph,
    yAxisDomain: [0, 'auto'],
  }],
  ['wind_direction_10m', {
    id: 'wind_direction_10m',
    label: 'Wind Direction',
    unit: '',
    unitImperial: '',
    color: '#a3e635',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)}`,
    yAxisDomain: [0, 360],
  }],
  ['relative_humidity_2m', {
    id: 'relative_humidity_2m',
    label: 'Humidity',
    unit: '%',
    unitImperial: '%',
    color: '#a78bfa',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)}%`,
    yAxisDomain: [0, 100],
  }],
  ['surface_pressure', {
    id: 'surface_pressure',
    label: 'Pressure',
    unit: 'hPa',
    unitImperial: 'inHg',
    color: '#c084fc',
    chartType: 'line',
    formatValue: (v, u) => u === 'metric' ? `${Math.round(v)}hPa` : `${hpaToInHg(v).toFixed(2)}inHg`,
    convertToImperial: hpaToInHg,
  }],
  ['cloud_cover', {
    id: 'cloud_cover',
    label: 'Cloud Cover',
    unit: '%',
    unitImperial: '%',
    color: '#94a3b8',
    chartType: 'area',
    formatValue: (v) => `${Math.round(v)}%`,
    yAxisDomain: [0, 100],
  }],
  ['cloud_cover_low', {
    id: 'cloud_cover_low',
    label: 'Low Clouds',
    unit: '%',
    unitImperial: '%',
    color: '#cbd5e1',
    chartType: 'area',
    formatValue: (v) => `${Math.round(v)}%`,
    yAxisDomain: [0, 100],
  }],
  ['cloud_cover_mid', {
    id: 'cloud_cover_mid',
    label: 'Mid Clouds',
    unit: '%',
    unitImperial: '%',
    color: '#9ca3af',
    chartType: 'area',
    formatValue: (v) => `${Math.round(v)}%`,
    yAxisDomain: [0, 100],
  }],
  ['cloud_cover_high', {
    id: 'cloud_cover_high',
    label: 'High Clouds',
    unit: '%',
    unitImperial: '%',
    color: '#6b7280',
    chartType: 'area',
    formatValue: (v) => `${Math.round(v)}%`,
    yAxisDomain: [0, 100],
  }],
  ['visibility', {
    id: 'visibility',
    label: 'Visibility',
    unit: 'm',
    unitImperial: 'ft',
    color: '#fbbf24',
    chartType: 'line',
    formatValue: (v, u) => u === 'metric' ? `${(v / 1000).toFixed(1)}km` : `${(mToFt(v) / 5280).toFixed(1)}mi`,
    convertToImperial: mToFt,
  }],
  ['freezing_level_height', {
    id: 'freezing_level_height',
    label: 'Freezing Level',
    unit: 'm',
    unitImperial: 'ft',
    color: '#2dd4bf',
    chartType: 'line',
    formatValue: (v, u) => u === 'metric' ? `${Math.round(v)}m` : `${Math.round(mToFt(v))}ft`,
    convertToImperial: mToFt,
  }],
  ['weather_code', {
    id: 'weather_code',
    label: 'Weather Code',
    unit: '',
    unitImperial: '',
    color: '#f472b6',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)}`,
    yAxisDomain: [0, 100],
  }],
]);

// Default selected models
export const DEFAULT_MODELS: WeatherModel[] = ['best_match', 'ecmwf_ifs', 'gfs_seamless', 'gem_seamless'];

// Default selected variables
export const DEFAULT_VARIABLES: WeatherVariable[] = [
  'temperature_2m',
  'precipitation',
  'snowfall',
  'wind_speed_10m',
  'relative_humidity_2m',
  'cloud_cover',
  'freezing_level_height',
];

// All available variables (in display order)
export const ALL_VARIABLES: WeatherVariable[] = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation',
  'rain',
  'snowfall',
  'snow_depth',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'relative_humidity_2m',
  'surface_pressure',
  'cloud_cover',
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'visibility',
  'freezing_level_height',
  'weather_code',
];

// All available models (in display order)
export const ALL_MODELS: WeatherModel[] = [
  'best_match',
  'ecmwf_ifs',
  'ecmwf_ifs025',
  'icon_seamless',
  'icon_eu',
  'gfs_seamless',
  'gem_seamless',
  'gem_hrdps_continental',
  'meteofrance_seamless',
  'meteofrance_arpege_europe',
  'metno_seamless',
  'metno_nordic',
  'knmi_seamless',
  'ncep_nbm_conus',
  'meteoswiss_icon_ch2',
  'kma_gdps',
];

// Get model config with fallback
export function getModelConfig(modelId: WeatherModel): ModelConfig {
  return MODEL_CONFIGS.get(modelId) ?? {
    id: modelId,
    name: modelId,
    color: '#6b7280',
  };
}

// Get variable config with fallback
export function getVariableConfig(variableId: WeatherVariable): VariableConfig {
  return VARIABLE_CONFIGS.get(variableId) ?? {
    id: variableId,
    label: variableId,
    unit: '',
    unitImperial: '',
    color: '#6b7280',
    chartType: 'line',
    formatValue: (v) => `${v}`,
  };
}

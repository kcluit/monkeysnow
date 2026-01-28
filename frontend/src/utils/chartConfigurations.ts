import type { WeatherModel, WeatherVariable } from '../types/openMeteo';
import type { VariableConfig, ModelConfig } from '../types/detailView';

// Weather model configurations (all 46 models)
export const MODEL_CONFIGS: Map<WeatherModel, ModelConfig> = new Map([
  // Auto-select
  ['best_match', { id: 'best_match', name: 'Best Match', color: '#6366f1', description: 'Auto-selected best model for location' }],

  // ECMWF
  ['ecmwf_ifs', { id: 'ecmwf_ifs', name: 'ECMWF IFS', color: '#3b82f6', description: 'European Centre for Medium-Range Weather Forecasts' }],
  ['ecmwf_ifs025', { id: 'ecmwf_ifs025', name: 'ECMWF IFS 0.25', color: '#0ea5e9', description: 'ECMWF high resolution' }],
  ['ecmwf_aifs025_single', { id: 'ecmwf_aifs025_single', name: 'ECMWF AIFS', color: '#2563eb', description: 'ECMWF AI-based forecast' }],

  // ICON (DWD Germany)
  ['icon_seamless', { id: 'icon_seamless', name: 'ICON Seamless', color: '#10b981', description: 'DWD ICON combined' }],
  ['icon_global', { id: 'icon_global', name: 'ICON Global', color: '#059669', description: 'DWD ICON 13km global' }],
  ['icon_eu', { id: 'icon_eu', name: 'ICON EU', color: '#14b8a6', description: 'DWD ICON 7km Europe' }],
  ['icon_d2', { id: 'icon_d2', name: 'ICON D2', color: '#0d9488', description: 'DWD ICON 2km Germany' }],

  // GFS (NOAA USA)
  ['gfs_seamless', { id: 'gfs_seamless', name: 'GFS Seamless', color: '#f59e0b', description: 'NOAA GFS combined' }],
  ['gfs_global', { id: 'gfs_global', name: 'GFS Global', color: '#d97706', description: 'NOAA GFS 25km global' }],
  ['gfs_hrrr', { id: 'gfs_hrrr', name: 'GFS HRRR', color: '#ea580c', description: 'NOAA HRRR 3km continental US' }],
  ['gfs_graphcast025', { id: 'gfs_graphcast025', name: 'GFS GraphCast', color: '#c2410c', description: 'NOAA GraphCast AI-based' }],

  // GEM (Canada)
  ['gem_seamless', { id: 'gem_seamless', name: 'GEM Seamless', color: '#ef4444', description: 'Canadian GEM combined' }],
  ['gem_global', { id: 'gem_global', name: 'GEM Global', color: '#dc2626', description: 'Canadian GEM 15km global' }],
  ['gem_regional', { id: 'gem_regional', name: 'GEM Regional', color: '#b91c1c', description: 'Canadian GEM 10km regional' }],
  ['gem_hrdps_continental', { id: 'gem_hrdps_continental', name: 'GEM HRDPS', color: '#991b1b', description: 'Canadian HRDPS 2.5km' }],
  ['gem_hrdps_west', { id: 'gem_hrdps_west', name: 'GEM HRDPS West', color: '#7f1d1d', description: 'Canadian HRDPS West 2.5km' }],

  // Meteo-France
  ['meteofrance_seamless', { id: 'meteofrance_seamless', name: 'MF Seamless', color: '#8b5cf6', description: 'Meteo-France combined' }],
  ['meteofrance_arpege_world', { id: 'meteofrance_arpege_world', name: 'MF ARPEGE World', color: '#7c3aed', description: 'Meteo-France ARPEGE 25km global' }],
  ['meteofrance_arpege_europe', { id: 'meteofrance_arpege_europe', name: 'MF ARPEGE Europe', color: '#6d28d9', description: 'Meteo-France ARPEGE 10km Europe' }],
  ['meteofrance_arome_france', { id: 'meteofrance_arome_france', name: 'MF AROME France', color: '#5b21b6', description: 'Meteo-France AROME 2.5km France' }],
  ['meteofrance_arome_france_hd', { id: 'meteofrance_arome_france_hd', name: 'MF AROME HD', color: '#4c1d95', description: 'Meteo-France AROME 1.5km France' }],

  // MetNo (Norway)
  ['metno_seamless', { id: 'metno_seamless', name: 'MetNo Seamless', color: '#ec4899', description: 'Norwegian MET combined' }],
  ['metno_nordic', { id: 'metno_nordic', name: 'MetNo Nordic', color: '#db2777', description: 'Norwegian MET 1km Nordic' }],

  // KNMI (Netherlands)
  ['knmi_seamless', { id: 'knmi_seamless', name: 'KNMI Seamless', color: '#84cc16', description: 'Dutch KNMI combined' }],
  ['knmi_harmonie_arome_europe', { id: 'knmi_harmonie_arome_europe', name: 'KNMI HARMONIE EU', color: '#65a30d', description: 'Dutch KNMI 5.5km Europe' }],
  ['knmi_harmonie_arome_netherlands', { id: 'knmi_harmonie_arome_netherlands', name: 'KNMI HARMONIE NL', color: '#4d7c0f', description: 'Dutch KNMI 2km Netherlands' }],

  // JMA (Japan)
  ['jma_seamless', { id: 'jma_seamless', name: 'JMA Seamless', color: '#f472b6', description: 'Japan Meteorological Agency combined' }],
  ['jma_msm', { id: 'jma_msm', name: 'JMA MSM', color: '#e879f9', description: 'JMA 5km Japan' }],
  ['jma_gsm', { id: 'jma_gsm', name: 'JMA GSM', color: '#d946ef', description: 'JMA 20km global' }],

  // UKMO (UK Met Office)
  ['ukmo_seamless', { id: 'ukmo_seamless', name: 'UKMO Seamless', color: '#22d3ee', description: 'UK Met Office combined' }],
  ['ukmo_global_deterministic_10km', { id: 'ukmo_global_deterministic_10km', name: 'UKMO Global', color: '#06b6d4', description: 'UK Met Office 10km global' }],
  ['ukmo_uk_deterministic_2km', { id: 'ukmo_uk_deterministic_2km', name: 'UKMO UK', color: '#0891b2', description: 'UK Met Office 2km UK' }],

  // DMI (Denmark)
  ['dmi_seamless', { id: 'dmi_seamless', name: 'DMI Seamless', color: '#a3e635', description: 'Danish Meteorological Institute combined' }],
  ['dmi_harmonie_arome_europe', { id: 'dmi_harmonie_arome_europe', name: 'DMI HARMONIE', color: '#84cc16', description: 'DMI 2km Europe' }],

  // MeteoSwiss
  ['meteoswiss_icon_seamless', { id: 'meteoswiss_icon_seamless', name: 'MeteoSwiss Seamless', color: '#2dd4bf', description: 'MeteoSwiss combined' }],
  ['meteoswiss_icon_ch1', { id: 'meteoswiss_icon_ch1', name: 'MeteoSwiss ICON-CH1', color: '#14b8a6', description: 'MeteoSwiss 1km Switzerland' }],
  ['meteoswiss_icon_ch2', { id: 'meteoswiss_icon_ch2', name: 'MeteoSwiss ICON-CH2', color: '#0d9488', description: 'MeteoSwiss 2km Switzerland' }],

  // KMA (Korea)
  ['kma_seamless', { id: 'kma_seamless', name: 'KMA Seamless', color: '#fb923c', description: 'Korea Meteorological Administration combined' }],
  ['kma_gdps', { id: 'kma_gdps', name: 'KMA GDPS', color: '#f97316', description: 'KMA 10km global' }],
  ['kma_ldps', { id: 'kma_ldps', name: 'KMA LDPS', color: '#ea580c', description: 'KMA 1.5km Korea' }],

  // Other
  ['cma_grapes_global', { id: 'cma_grapes_global', name: 'CMA GRAPES', color: '#fbbf24', description: 'China Meteorological 15km' }],
  ['bom_access_global', { id: 'bom_access_global', name: 'BOM ACCESS', color: '#a78bfa', description: 'Australia BoM 12km global' }],
  ['ncep_nbm_conus', { id: 'ncep_nbm_conus', name: 'NCEP NBM', color: '#22c55e', description: 'NOAA National Blend of Models' }],
  ['ncep_nam_conus', { id: 'ncep_nam_conus', name: 'NCEP NAM', color: '#16a34a', description: 'NOAA North American Mesoscale' }],
  ['italia_meteo_arpae_icon_2i', { id: 'italia_meteo_arpae_icon_2i', name: 'Italia Meteo ICON', color: '#f87171', description: 'Italia Meteo 2km Italy' }],
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

// Helper to convert kPa to psi
const kpaToPsi = (kpa: number): number => kpa * 0.145038;

// Helper to convert seconds to minutes
const secToMin = (sec: number): number => sec / 60;

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
    description: 'Air temperature at 2 meters above ground',
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
    description: 'Perceived temperature combining wind chill, humidity and solar radiation',
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
    description: 'Total precipitation (rain, showers, snow) sum of the preceding hour',
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
    description: 'Rain from large scale weather systems of the preceding hour',
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
    description: 'Snowfall amount of the preceding hour',
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
    description: 'Snow depth on the ground',
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
    description: 'Wind speed at 10 meters above ground',
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
    description: 'Maximum wind gusts of the preceding hour at 10m above ground',
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
    description: 'Wind direction at 10 meters above ground',
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
    description: 'Relative humidity at 2 meters above ground',
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
    description: 'Atmospheric air pressure at surface',
  }],
  ['cloud_cover', {
    id: 'cloud_cover',
    label: 'Cloud Cover',
    unit: '%',
    unitImperial: '%',
    color: '#94a3b8',
    chartType: 'line', // Changed from area to line for better multi-model comparison
    formatValue: (v) => `${Math.round(v)}%`,
    yAxisDomain: [0, 100],
    description: 'Total cloud cover as an area fraction',
  }],
  ['cloud_cover_low', {
    id: 'cloud_cover_low',
    label: 'Low Clouds',
    unit: '%',
    unitImperial: '%',
    color: '#cbd5e1',
    chartType: 'line', // Changed from area to line for better multi-model comparison
    formatValue: (v) => `${Math.round(v)}%`,
    yAxisDomain: [0, 100],
  }],
  ['cloud_cover_mid', {
    id: 'cloud_cover_mid',
    label: 'Mid Clouds',
    unit: '%',
    unitImperial: '%',
    color: '#9ca3af',
    chartType: 'line', // Changed from area to line for better multi-model comparison
    formatValue: (v) => `${Math.round(v)}%`,
    yAxisDomain: [0, 100],
  }],
  ['cloud_cover_high', {
    id: 'cloud_cover_high',
    label: 'High Clouds',
    unit: '%',
    unitImperial: '%',
    color: '#6b7280',
    chartType: 'line', // Changed from area to line for better multi-model comparison
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
  // New variables
  ['dew_point_2m', {
    id: 'dew_point_2m',
    label: 'Dew Point',
    unit: 'C',
    unitImperial: 'F',
    color: '#14b8a6',
    chartType: 'line',
    formatValue: (v, u) => u === 'metric' ? `${Math.round(v)}C` : `${Math.round(tempToImperial(v))}F`,
    convertToImperial: tempToImperial,
  }],
  ['wet_bulb_temperature_2m', {
    id: 'wet_bulb_temperature_2m',
    label: 'Wet Bulb Temp',
    unit: 'C',
    unitImperial: 'F',
    color: '#0d9488',
    chartType: 'line',
    formatValue: (v, u) => u === 'metric' ? `${Math.round(v)}C` : `${Math.round(tempToImperial(v))}F`,
    convertToImperial: tempToImperial,
  }],
  ['precipitation_probability', {
    id: 'precipitation_probability',
    label: 'Precip Probability',
    unit: '%',
    unitImperial: '%',
    color: '#6366f1',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)}%`,
    yAxisDomain: [0, 100],
  }],
  ['showers', {
    id: 'showers',
    label: 'Showers',
    unit: 'mm',
    unitImperial: 'in',
    color: '#818cf8',
    chartType: 'bar',
    formatValue: (v, u) => u === 'metric' ? `${v.toFixed(1)}mm` : `${mmToInches(v).toFixed(2)}in`,
    convertToImperial: mmToInches,
    yAxisDomain: [0, 'auto'],
  }],
  ['pressure_msl', {
    id: 'pressure_msl',
    label: 'Sea Level Pressure',
    unit: 'hPa',
    unitImperial: 'inHg',
    color: '#a855f7',
    chartType: 'line',
    formatValue: (v, u) => u === 'metric' ? `${Math.round(v)}hPa` : `${hpaToInHg(v).toFixed(2)}inHg`,
    convertToImperial: hpaToInHg,
  }],
  ['vapour_pressure_deficit', {
    id: 'vapour_pressure_deficit',
    label: 'Vapour Pressure Deficit',
    unit: 'kPa',
    unitImperial: 'psi',
    color: '#d946ef',
    chartType: 'line',
    formatValue: (v, u) => u === 'metric' ? `${v.toFixed(2)}kPa` : `${kpaToPsi(v).toFixed(3)}psi`,
    convertToImperial: kpaToPsi,
    yAxisDomain: [0, 'auto'],
  }],
  ['boundary_layer_height', {
    id: 'boundary_layer_height',
    label: 'Boundary Layer Height',
    unit: 'm',
    unitImperial: 'ft',
    color: '#7c3aed',
    chartType: 'line',
    formatValue: (v, u) => u === 'metric' ? `${Math.round(v)}m` : `${Math.round(mToFt(v))}ft`,
    convertToImperial: mToFt,
    yAxisDomain: [0, 'auto'],
  }],
  ['shortwave_radiation', {
    id: 'shortwave_radiation',
    label: 'Shortwave Radiation',
    unit: 'W/m²',
    unitImperial: 'W/m²',
    color: '#fbbf24',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)}W/m²`,
    yAxisDomain: [0, 'auto'],
  }],
  ['direct_radiation', {
    id: 'direct_radiation',
    label: 'Direct Radiation',
    unit: 'W/m²',
    unitImperial: 'W/m²',
    color: '#f59e0b',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)}W/m²`,
    yAxisDomain: [0, 'auto'],
  }],
  ['diffuse_radiation', {
    id: 'diffuse_radiation',
    label: 'Diffuse Radiation',
    unit: 'W/m²',
    unitImperial: 'W/m²',
    color: '#d97706',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)}W/m²`,
    yAxisDomain: [0, 'auto'],
  }],
  ['direct_normal_irradiance', {
    id: 'direct_normal_irradiance',
    label: 'Direct Normal Irradiance',
    unit: 'W/m²',
    unitImperial: 'W/m²',
    color: '#ea580c',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)}W/m²`,
    yAxisDomain: [0, 'auto'],
  }],
  ['global_tilted_irradiance', {
    id: 'global_tilted_irradiance',
    label: 'Global Tilted Irradiance',
    unit: 'W/m²',
    unitImperial: 'W/m²',
    color: '#c2410c',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)}W/m²`,
    yAxisDomain: [0, 'auto'],
  }],
  ['terrestrial_radiation', {
    id: 'terrestrial_radiation',
    label: 'Terrestrial Radiation',
    unit: 'W/m²',
    unitImperial: 'W/m²',
    color: '#9a3412',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)}W/m²`,
    yAxisDomain: [0, 'auto'],
  }],
  ['uv_index', {
    id: 'uv_index',
    label: 'UV Index',
    unit: '',
    unitImperial: '',
    color: '#e11d48',
    chartType: 'line',
    formatValue: (v) => `${v.toFixed(1)}`,
    yAxisDomain: [0, 12],
  }],
  ['uv_index_clear_sky', {
    id: 'uv_index_clear_sky',
    label: 'UV Index (Clear Sky)',
    unit: '',
    unitImperial: '',
    color: '#be123c',
    chartType: 'line',
    formatValue: (v) => `${v.toFixed(1)}`,
    yAxisDomain: [0, 12],
  }],
  ['sunshine_duration', {
    id: 'sunshine_duration',
    label: 'Sunshine Duration',
    unit: 'sec',
    unitImperial: 'min',
    color: '#facc15',
    chartType: 'bar',
    formatValue: (v, u) => u === 'metric' ? `${Math.round(v)}s` : `${secToMin(v).toFixed(1)}min`,
    convertToImperial: secToMin,
    yAxisDomain: [0, 'auto'],
  }],
  ['is_day', {
    id: 'is_day',
    label: 'Day/Night',
    unit: '',
    unitImperial: '',
    color: '#fde047',
    chartType: 'area',
    formatValue: (v) => v === 1 ? 'Day' : 'Night',
    yAxisDomain: [0, 1],
  }],
  ['soil_temperature_0cm', {
    id: 'soil_temperature_0cm',
    label: 'Soil Temperature',
    unit: 'C',
    unitImperial: 'F',
    color: '#a16207',
    chartType: 'line',
    formatValue: (v, u) => u === 'metric' ? `${Math.round(v)}C` : `${Math.round(tempToImperial(v))}F`,
    convertToImperial: tempToImperial,
  }],
  ['soil_moisture_0_to_1cm', {
    id: 'soil_moisture_0_to_1cm',
    label: 'Soil Moisture',
    unit: 'm³/m³',
    unitImperial: 'm³/m³',
    color: '#854d0e',
    chartType: 'area',
    formatValue: (v) => `${v.toFixed(3)}`,
    yAxisDomain: [0, 1],
  }],
  ['evapotranspiration', {
    id: 'evapotranspiration',
    label: 'Evapotranspiration',
    unit: 'mm',
    unitImperial: 'in',
    color: '#65a30d',
    chartType: 'bar',
    formatValue: (v, u) => u === 'metric' ? `${v.toFixed(2)}mm` : `${mmToInches(v).toFixed(3)}in`,
    convertToImperial: mmToInches,
    yAxisDomain: [0, 'auto'],
  }],
  ['et0_fao_evapotranspiration', {
    id: 'et0_fao_evapotranspiration',
    label: 'Reference Evapotranspiration',
    unit: 'mm',
    unitImperial: 'in',
    color: '#4d7c0f',
    chartType: 'bar',
    formatValue: (v, u) => u === 'metric' ? `${v.toFixed(2)}mm` : `${mmToInches(v).toFixed(3)}in`,
    convertToImperial: mmToInches,
    yAxisDomain: [0, 'auto'],
  }],
  ['cape', {
    id: 'cape',
    label: 'CAPE',
    unit: 'J/kg',
    unitImperial: 'J/kg',
    color: '#dc2626',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)}J/kg`,
    yAxisDomain: [0, 'auto'],
  }],
  ['lifted_index', {
    id: 'lifted_index',
    label: 'Lifted Index',
    unit: '',
    unitImperial: '',
    color: '#b91c1c',
    chartType: 'line',
    formatValue: (v) => `${v.toFixed(1)}`,
  }],
  ['convective_inhibition', {
    id: 'convective_inhibition',
    label: 'Convective Inhibition',
    unit: 'J/kg',
    unitImperial: 'J/kg',
    color: '#991b1b',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)}J/kg`,
    yAxisDomain: ['auto', 0],
  }],
]);

// Default selected models - all seamless models
export const DEFAULT_MODELS: WeatherModel[] = [
  'icon_seamless',
  'gfs_seamless',
  'gem_seamless',
  'meteofrance_seamless',
  'metno_seamless',
  'knmi_seamless',
  'jma_seamless',
  'ukmo_seamless',
  'dmi_seamless',
  'meteoswiss_icon_seamless',
  'kma_seamless',
];

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
  // Temperature
  'temperature_2m',
  'apparent_temperature',
  'dew_point_2m',
  'wet_bulb_temperature_2m',
  // Precipitation
  'precipitation',
  'precipitation_probability',
  'rain',
  'showers',
  'snowfall',
  'snow_depth',
  // Wind
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  // Atmosphere
  'relative_humidity_2m',
  'surface_pressure',
  'pressure_msl',
  'vapour_pressure_deficit',
  'boundary_layer_height',
  // Clouds & Visibility
  'cloud_cover',
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'visibility',
  // Solar & Radiation
  'shortwave_radiation',
  'direct_radiation',
  'diffuse_radiation',
  'direct_normal_irradiance',
  'global_tilted_irradiance',
  'terrestrial_radiation',
  // UV & Sunshine
  'uv_index',
  'uv_index_clear_sky',
  'sunshine_duration',
  'is_day',
  // Soil
  'soil_temperature_0cm',
  'soil_moisture_0_to_1cm',
  'evapotranspiration',
  'et0_fao_evapotranspiration',
  // Convective/Stability
  'cape',
  'lifted_index',
  'convective_inhibition',
  'freezing_level_height',
  'weather_code',
];

// All available models (in display order)
export const ALL_MODELS: WeatherModel[] = [
  'best_match',
  // ECMWF
  'ecmwf_ifs',
  'ecmwf_ifs025',
  'ecmwf_aifs025_single',
  // ICON
  'icon_seamless',
  'icon_global',
  'icon_eu',
  'icon_d2',
  // GFS
  'gfs_seamless',
  'gfs_global',
  'gfs_hrrr',
  'gfs_graphcast025',
  // GEM
  'gem_seamless',
  'gem_global',
  'gem_regional',
  'gem_hrdps_continental',
  'gem_hrdps_west',
  // Meteo-France
  'meteofrance_seamless',
  'meteofrance_arpege_world',
  'meteofrance_arpege_europe',
  'meteofrance_arome_france',
  'meteofrance_arome_france_hd',
  // MetNo
  'metno_seamless',
  'metno_nordic',
  // KNMI
  'knmi_seamless',
  'knmi_harmonie_arome_europe',
  'knmi_harmonie_arome_netherlands',
  // JMA
  'jma_seamless',
  'jma_msm',
  'jma_gsm',
  // UKMO
  'ukmo_seamless',
  'ukmo_global_deterministic_10km',
  'ukmo_uk_deterministic_2km',
  // DMI
  'dmi_seamless',
  'dmi_harmonie_arome_europe',
  // MeteoSwiss
  'meteoswiss_icon_seamless',
  'meteoswiss_icon_ch1',
  'meteoswiss_icon_ch2',
  // KMA
  'kma_seamless',
  'kma_gdps',
  'kma_ldps',
  // Other
  'cma_grapes_global',
  'bom_access_global',
  'ncep_nbm_conus',
  'ncep_nam_conus',
  'italia_meteo_arpae_icon_2i',
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
    formatValue: (v) => `${Number.isInteger(v) ? v : parseFloat(v.toFixed(2))}`,
  };
}

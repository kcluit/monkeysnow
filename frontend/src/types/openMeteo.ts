// Open-Meteo API types

// Weather models available from Open-Meteo (all 46 models)
export type WeatherModel =
  | 'best_match'
  // ECMWF
  | 'ecmwf_ifs'
  | 'ecmwf_ifs025'
  | 'ecmwf_aifs025_single'
  // ICON (DWD Germany)
  | 'icon_seamless'
  | 'icon_global'
  | 'icon_eu'
  | 'icon_d2'
  // GFS (NOAA USA)
  | 'gfs_seamless'
  | 'gfs_global'
  | 'gfs_hrrr'
  | 'gfs_graphcast025'
  // GEM (Canada)
  | 'gem_seamless'
  | 'gem_global'
  | 'gem_regional'
  | 'gem_hrdps_continental'
  | 'gem_hrdps_west'
  // Meteo-France
  | 'meteofrance_seamless'
  | 'meteofrance_arpege_world'
  | 'meteofrance_arpege_europe'
  | 'meteofrance_arome_france'
  | 'meteofrance_arome_france_hd'
  // MetNo (Norway)
  | 'metno_seamless'
  | 'metno_nordic'
  // KNMI (Netherlands)
  | 'knmi_seamless'
  | 'knmi_harmonie_arome_europe'
  | 'knmi_harmonie_arome_netherlands'
  // JMA (Japan)
  | 'jma_seamless'
  | 'jma_msm'
  | 'jma_gsm'
  // UKMO (UK Met Office)
  | 'ukmo_seamless'
  | 'ukmo_global_deterministic_10km'
  | 'ukmo_uk_deterministic_2km'
  // DMI (Denmark)
  | 'dmi_seamless'
  | 'dmi_harmonie_arome_europe'
  // MeteoSwiss
  | 'meteoswiss_icon_seamless'
  | 'meteoswiss_icon_ch1'
  | 'meteoswiss_icon_ch2'
  // KMA (Korea)
  | 'kma_seamless'
  | 'kma_gdps'
  | 'kma_ldps'
  // CMA (China)
  | 'cma_grapes_global'
  // BOM (Australia)
  | 'bom_access_global'
  // NCEP
  | 'ncep_nbm_conus'
  | 'ncep_nam_conus'
  // Italia Meteo
  | 'italia_meteo_arpae_icon_2i';

// Aggregation types for model ensemble
export type AggregationType = 'median' | 'mean' | 'min' | 'max' | 'p25' | 'p75';

// Combined type for models and aggregations
export type ModelOrAggregation = WeatherModel | AggregationType;

// Weather variables available from Open-Meteo hourly endpoint
export type WeatherVariable =
  | 'temperature_2m'
  | 'apparent_temperature'
  | 'precipitation'
  | 'rain'
  | 'snowfall'
  | 'snow_depth'
  | 'wind_speed_10m'
  | 'wind_gusts_10m'
  | 'wind_direction_10m'
  | 'relative_humidity_2m'
  | 'surface_pressure'
  | 'cloud_cover'
  | 'cloud_cover_low'
  | 'cloud_cover_mid'
  | 'cloud_cover_high'
  | 'visibility'
  | 'freezing_level_height'
  | 'weather_code';

// Raw response from Open-Meteo API
export interface OpenMeteoHourlyData {
  time: string[];
  [key: string]: number[] | string[];
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  timezone_abbreviation: string;
  utc_offset_seconds: number;
  hourly: OpenMeteoHourlyData;
  hourly_units: Record<string, string>;
}

// Processed data for a single model
export interface ModelWeatherData {
  modelId: WeatherModel;
  modelName: string;
  hourly: HourlyDataPoint[];
}

// Single hourly data point with timestamp and values
export interface HourlyDataPoint {
  time: Date;
  timestamp: number;
  [key: string]: number | Date; // Dynamic keys for each variable
}

// Timezone information from API response
export interface TimezoneInfo {
  timezone: string;           // IANA timezone (e.g., "America/Vancouver")
  timezoneAbbreviation: string; // Short form (e.g., "PST")
}

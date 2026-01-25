// Open-Meteo API types

// Weather models available from Open-Meteo
export type WeatherModel =
  | 'best_match'
  | 'ecmwf_ifs'
  | 'ecmwf_ifs025'
  | 'icon_seamless'
  | 'icon_eu'
  | 'gfs_seamless'
  | 'gem_seamless'
  | 'gem_hrdps_continental'
  | 'meteofrance_seamless'
  | 'meteofrance_arpege_europe'
  | 'metno_seamless'
  | 'metno_nordic'
  | 'knmi_seamless'
  | 'ncep_nbm_conus'
  | 'meteoswiss_icon_ch2'
  | 'kma_gdps';

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

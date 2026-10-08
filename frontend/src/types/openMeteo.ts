// Open-Meteo API types

// Forecast models served by Open-Meteo's /v1/forecast, by their documented IDs.
// The catalogue (names, Coverage, Recommended models) lives in data/modelHierarchy.ts.
export type WeatherModel =
  | 'best_match'
  // ECMWF
  | 'ecmwf_ifs'
  | 'ecmwf_ifs025'
  | 'ecmwf_aifs025_single'
  // NOAA (USA)
  | 'ncep_gfs_seamless'
  | 'ncep_gfs_global'
  | 'ncep_aigfs025'
  | 'ncep_hgefs025_ensemble_mean'
  | 'ncep_nam_conus'
  | 'ncep_hrrr_conus'
  | 'ncep_nbm_conus'
  // DWD (Germany)
  | 'dwd_icon_seamless'
  | 'dwd_icon_global'
  | 'dwd_icon_global_native'
  | 'dwd_icon_eu'
  | 'dwd_icon_d2'
  | 'dwd_icon_d2_native'
  // ECCC (Canada)
  | 'cmc_gem_seamless'
  | 'cmc_gem_gdps'
  | 'cmc_gem_rdps'
  | 'cmc_gem_hrdps'
  | 'cmc_gem_hrdps_west'
  // Météo-France
  | 'meteofrance_seamless'
  | 'meteofrance_arpege_seamless'
  | 'meteofrance_arome_seamless'
  | 'meteofrance_arpege_world'
  | 'meteofrance_arpege_europe'
  | 'meteofrance_arome_france'
  | 'meteofrance_arome_france_hd'
  // UK Met Office
  | 'ukmo_seamless'
  | 'ukmo_global_deterministic_10km'
  | 'ukmo_uk_deterministic_2km'
  // JMA (Japan)
  | 'jma_seamless'
  | 'jma_gsm'
  | 'jma_msm'
  // KNMI (Netherlands)
  | 'knmi_seamless'
  | 'knmi_harmonie_arome_europe'
  | 'knmi_harmonie_arome_netherlands'
  // DMI (Denmark)
  | 'dmi_seamless'
  | 'dmi_harmonie_arome_europe'
  // MET Norway
  | 'metno_seamless'
  | 'metno_nordic'
  // MeteoSwiss
  | 'meteoswiss_icon_seamless'
  | 'meteoswiss_icon_ch2'
  | 'meteoswiss_icon_ch1'
  // GeoSphere Austria
  | 'geosphere_seamless'
  | 'geosphere_arome_austria'
  // CHMI (Czechia)
  | 'chmi_aladin_seamless'
  | 'chmi_aladin_central_europe_2km'
  | 'chmi_aladin_cz_1km'
  // ItaliaMeteo
  | 'italia_meteo_arpae_icon_2i'
  // CMA (China)
  | 'cma_grapes_global';

// Aggregation types for model ensemble
export type AggregationType = 'median' | 'mean' | 'min' | 'max' | 'p25' | 'p75';

// Combined type for models and aggregations
export type ModelOrAggregation = WeatherModel | AggregationType;

// Weather variables available from Open-Meteo hourly endpoint
export type WeatherVariable =
  // Temperature
  | 'temperature_2m'
  | 'apparent_temperature'
  | 'dew_point_2m'
  | 'wet_bulb_temperature_2m'
  // Precipitation
  | 'precipitation'
  | 'precipitation_probability'
  | 'rain'
  | 'showers'
  | 'snowfall'
  | 'snow_depth'
  // Snow
  | 'snowfall_height'
  | 'snowfall_water_equivalent'
  | 'snow_depth_water_equivalent'
  | 'snow_density'
  // Precipitation type & hazards
  | 'precipitation_type'
  | 'hail'
  | 'lightning_potential'
  | 'thunderstorm_probability'
  | 'snowfall_probability'
  | 'freezing_rain_probability'
  | 'ice_pellets_probability'
  | 'rain_probability'
  // Wind (base level)
  | 'wind_speed_10m'
  | 'wind_gusts_10m'
  | 'wind_direction_10m'
  // Wind (multi-level overlays)
  | 'wind_speed_80m'
  | 'wind_speed_120m'
  | 'wind_speed_180m'
  | 'wind_direction_80m'
  | 'wind_direction_120m'
  | 'wind_direction_180m'
  // Atmosphere
  | 'relative_humidity_2m'
  | 'surface_pressure'
  | 'pressure_msl'
  | 'vapour_pressure_deficit'
  | 'boundary_layer_height'
  // Clouds & Visibility
  | 'cloud_cover'
  | 'cloud_cover_low'
  | 'cloud_cover_mid'
  | 'cloud_cover_high'
  | 'visibility'
  // Solar & Radiation
  | 'shortwave_radiation'
  | 'direct_radiation'
  | 'diffuse_radiation'
  | 'direct_normal_irradiance'
  | 'global_tilted_irradiance'
  | 'terrestrial_radiation'
  // UV & Sunshine
  | 'uv_index'
  | 'uv_index_clear_sky'
  | 'sunshine_duration'
  | 'is_day'
  // Soil (base level)
  | 'soil_temperature_0cm'
  | 'soil_moisture_0_to_1cm'
  | 'evapotranspiration'
  | 'et0_fao_evapotranspiration'
  // Soil (multi-level overlays)
  | 'soil_temperature_6cm'
  | 'soil_temperature_18cm'
  | 'soil_temperature_54cm'
  | 'soil_moisture_1_to_3cm'
  | 'soil_moisture_3_to_9cm'
  | 'soil_moisture_9_to_27cm'
  | 'soil_moisture_27_to_81cm'
  // Convective/Stability
  | 'cape'
  | 'lifted_index'
  | 'convective_inhibition'
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

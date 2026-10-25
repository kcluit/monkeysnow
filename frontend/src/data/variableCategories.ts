import type { WeatherVariable } from '../types/openMeteo';
import { translate } from '../locales';

export interface VariableCategory {
  id: string;
  name: string;
  variables: WeatherVariable[];
}

// Names are getters, looked up in the language showing each time they're read
export const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    id: 'temperature',
    get name() { return translate('chart.category.temperature'); },
    variables: ['temperature_2m', 'apparent_temperature', 'dew_point_2m', 'wet_bulb_temperature_2m'],
  },
  {
    id: 'precipitation',
    get name() { return translate('chart.category.precipitation'); },
    variables: ['precipitation', 'precipitation_probability', 'rain', 'showers', 'snowfall', 'snow_depth'],
  },
  {
    id: 'snow',
    get name() { return translate('chart.category.snow'); },
    variables: ['snowfall_height', 'snowfall_water_equivalent', 'snow_depth_water_equivalent', 'snow_density'],
  },
  {
    id: 'hazards',
    get name() { return translate('chart.category.hazards'); },
    variables: [
      'precipitation_type',
      'hail',
      'lightning_potential',
      'thunderstorm_probability',
      'snowfall_probability',
      'freezing_rain_probability',
      'ice_pellets_probability',
      'rain_probability',
    ],
  },
  {
    id: 'wind',
    get name() { return translate('chart.category.wind'); },
    variables: ['wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m'],
  },
  {
    id: 'atmosphere',
    get name() { return translate('chart.category.atmosphere'); },
    variables: ['relative_humidity_2m', 'surface_pressure', 'pressure_msl', 'vapour_pressure_deficit', 'boundary_layer_height'],
  },
  {
    id: 'clouds',
    get name() { return translate('chart.category.clouds'); },
    variables: [
      'cloud_cover',
      'cloud_cover_low',
      'cloud_cover_mid',
      'cloud_cover_high',
      'visibility',
      'cloud_cover_2m',
      'cloud_base',
      'cloud_top',
      'convective_cloud_base',
      'convective_cloud_top',
    ],
  },
  {
    id: 'radiation',
    get name() { return translate('chart.category.radiation'); },
    variables: ['shortwave_radiation', 'direct_radiation', 'diffuse_radiation', 'direct_normal_irradiance', 'global_tilted_irradiance', 'terrestrial_radiation'],
  },
  {
    id: 'uv',
    get name() { return translate('chart.category.uv'); },
    variables: ['uv_index', 'uv_index_clear_sky', 'sunshine_duration', 'is_day'],
  },
  {
    id: 'soil',
    get name() { return translate('chart.category.soil'); },
    variables: ['soil_temperature_0cm', 'soil_moisture_0_to_1cm', 'evapotranspiration', 'et0_fao_evapotranspiration'],
  },
  {
    id: 'stability',
    get name() { return translate('chart.category.stability'); },
    variables: ['cape', 'lifted_index', 'convective_inhibition', 'freezing_level_height', 'weather_code', 'k_index', 'updraft'],
  },
  {
    id: 'upperAir',
    get name() { return translate('chart.category.upperAir'); },
    variables: ['temperature_80m', 'total_column_integrated_water_vapour', 'surface_temperature', 'skin_temperature'],
  },
];

// Lookup map for O(1) category finding
export const VARIABLE_TO_CATEGORY = new Map<WeatherVariable, string>(
  VARIABLE_CATEGORIES.flatMap(cat =>
    cat.variables.map(v => [v, cat.id] as [WeatherVariable, string])
  )
);

// Get category for a variable
export function getCategoryForVariable(variable: WeatherVariable): VariableCategory | undefined {
  const categoryId = VARIABLE_TO_CATEGORY.get(variable);
  return VARIABLE_CATEGORIES.find(c => c.id === categoryId);
}

// Get all variables as a flat list (in category order)
export function getAllVariablesInOrder(): WeatherVariable[] {
  return VARIABLE_CATEGORIES.flatMap(cat => cat.variables);
}

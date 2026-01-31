import type { WeatherVariable } from '../types/openMeteo';

export interface VariableCategory {
  id: string;
  name: string;
  variables: WeatherVariable[];
}

export const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    id: 'temperature',
    name: 'Temperature',
    variables: ['temperature_2m', 'apparent_temperature', 'dew_point_2m', 'wet_bulb_temperature_2m'],
  },
  {
    id: 'precipitation',
    name: 'Precipitation',
    variables: ['precipitation', 'precipitation_probability', 'rain', 'showers', 'snowfall', 'snow_depth'],
  },
  {
    id: 'wind',
    name: 'Wind',
    variables: ['wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m'],
  },
  {
    id: 'atmosphere',
    name: 'Atmosphere',
    variables: ['relative_humidity_2m', 'surface_pressure', 'pressure_msl', 'vapour_pressure_deficit', 'boundary_layer_height'],
  },
  {
    id: 'clouds',
    name: 'Clouds & Visibility',
    variables: ['cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high', 'visibility'],
  },
  {
    id: 'radiation',
    name: 'Solar & Radiation',
    variables: ['shortwave_radiation', 'direct_radiation', 'diffuse_radiation', 'direct_normal_irradiance', 'global_tilted_irradiance', 'terrestrial_radiation'],
  },
  {
    id: 'uv',
    name: 'UV & Sunshine',
    variables: ['uv_index', 'uv_index_clear_sky', 'sunshine_duration', 'is_day'],
  },
  {
    id: 'soil',
    name: 'Soil',
    variables: ['soil_temperature_0cm', 'soil_moisture_0_to_1cm', 'evapotranspiration', 'et0_fao_evapotranspiration'],
  },
  {
    id: 'stability',
    name: 'Convective / Stability',
    variables: ['cape', 'lifted_index', 'convective_inhibition', 'freezing_level_height', 'weather_code'],
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

import { fetchWeatherApi } from 'openmeteo';
import type { WeatherModel, WeatherVariable, HourlyDataPoint, TimezoneInfo } from '../types/openMeteo';

// Import locations from backend
import locationsData from '../../../backend/locations.json';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

// DEV MODE: Enable mock data for performance testing
// Set window.__USE_MOCK_DATA = true in browser console to enable
// Or set sessionStorage.__USE_MOCK_DATA = 'true' for persistence across reloads
declare global {
  interface Window {
    __USE_MOCK_DATA?: boolean;
  }
}

// Check if mock mode is enabled (from window or sessionStorage)
function isMockModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.__USE_MOCK_DATA) return true;
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('__USE_MOCK_DATA') === 'true') {
    window.__USE_MOCK_DATA = true; // Sync to window for consistency
    return true;
  }
  return false;
}

/**
 * Generate mock weather data for performance testing.
 * Creates realistic-looking data with sine wave patterns and noise.
 */
function generateMockData(
  models: WeatherModel[],
  variables: WeatherVariable[],
  forecastDays: number
): { data: Map<WeatherModel, HourlyDataPoint[]>; timezoneInfo: TimezoneInfo } {
  const hoursCount = forecastDays * 24;
  const startTime = new Date();
  startTime.setMinutes(0, 0, 0);

  const mockData = new Map<WeatherModel, HourlyDataPoint[]>();

  // Base values and patterns for different variables
  const varPatterns: Record<string, { base: number; amplitude: number; noise: number }> = {
    temperature_2m: { base: 5, amplitude: 8, noise: 2 },
    apparent_temperature: { base: 3, amplitude: 10, noise: 2 },
    precipitation: { base: 0, amplitude: 2, noise: 1 },
    rain: { base: 0, amplitude: 1.5, noise: 0.5 },
    snowfall: { base: 0.5, amplitude: 2, noise: 1 },
    snow_depth: { base: 50, amplitude: 20, noise: 5 },
    wind_speed_10m: { base: 15, amplitude: 10, noise: 5 },
    wind_gusts_10m: { base: 25, amplitude: 15, noise: 8 },
    wind_direction_10m: { base: 180, amplitude: 90, noise: 30 },
    relative_humidity_2m: { base: 70, amplitude: 20, noise: 10 },
    surface_pressure: { base: 1013, amplitude: 15, noise: 3 },
    cloud_cover: { base: 50, amplitude: 40, noise: 20 },
    cloud_cover_low: { base: 30, amplitude: 25, noise: 15 },
    cloud_cover_mid: { base: 40, amplitude: 30, noise: 15 },
    cloud_cover_high: { base: 35, amplitude: 30, noise: 15 },
    visibility: { base: 20000, amplitude: 15000, noise: 5000 },
    freezing_level_height: { base: 2500, amplitude: 800, noise: 200 },
    weather_code: { base: 50, amplitude: 40, noise: 20 },
  };

  models.forEach((model, modelIdx) => {
    const hourlyData: HourlyDataPoint[] = [];
    // Add model-specific offset for variation between models
    const modelOffset = modelIdx * 0.3;

    for (let i = 0; i < hoursCount; i++) {
      const time = new Date(startTime.getTime() + i * 60 * 60 * 1000);
      const point: HourlyDataPoint = {
        time,
        timestamp: time.getTime(),
      };

      variables.forEach((variable) => {
        const pattern = varPatterns[variable] || { base: 10, amplitude: 5, noise: 2 };
        // Create a wave pattern with model offset and random noise
        const waveValue = Math.sin((i + modelOffset * 10) / 12) * pattern.amplitude;
        const noise = (Math.random() - 0.5) * pattern.noise * 2;
        let value = pattern.base + waveValue + noise;

        // Clamp certain variables to realistic ranges
        if (variable === 'precipitation' || variable === 'rain' || variable === 'snowfall') {
          value = Math.max(0, value) * (Math.random() > 0.7 ? 1 : 0); // Intermittent precipitation
        } else if (variable.includes('cloud_cover') || variable === 'relative_humidity_2m') {
          value = Math.max(0, Math.min(100, value));
        } else if (variable === 'wind_direction_10m') {
          value = ((value % 360) + 360) % 360;
        }

        point[variable] = value;
      });

      hourlyData.push(point);
    }
    mockData.set(model, hourlyData);
  });

  return {
    data: mockData,
    timezoneInfo: {
      timezone: 'America/Vancouver',
      timezoneAbbreviation: 'PST',
    },
  };
}

// Location data structure from locations.json
interface ResortLocation {
  bot: number;
  mid: number;
  top: number;
  loc: [number, number]; // [lat, lon]
}

// Flatten locations.json for easy lookup
function buildLocationMap(): Map<string, ResortLocation> {
  const map = new Map<string, ResortLocation>();

  function traverse(obj: unknown, path: string[] = []): void {
    if (obj && typeof obj === 'object' && 'loc' in obj && 'bot' in obj) {
      // This is a resort location
      const key = path[path.length - 1];
      map.set(key, obj as ResortLocation);
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        traverse(value, [...path, key]);
      }
    }
  }

  traverse(locationsData);
  return map;
}

const LOCATION_MAP = buildLocationMap();

// Get resort location by name (API format like "Big-White")
export function getResortLocation(resortName: string): ResortLocation | null {
  // Try direct lookup
  if (LOCATION_MAP.has(resortName)) {
    return LOCATION_MAP.get(resortName)!;
  }

  // Try with dashes converted from spaces
  const dashName = resortName.replace(/\s+/g, '-');
  if (LOCATION_MAP.has(dashName)) {
    return LOCATION_MAP.get(dashName)!;
  }

  // Try case-insensitive lookup
  for (const [key, value] of LOCATION_MAP.entries()) {
    if (key.toLowerCase() === resortName.toLowerCase() ||
        key.toLowerCase() === dashName.toLowerCase()) {
      return value;
    }
  }

  return null;
}

// Get all resort names
export function getAllResortNames(): string[] {
  return Array.from(LOCATION_MAP.keys());
}

// Return type for fetchOpenMeteoData including timezone info
export interface FetchOpenMeteoDataResult {
  data: Map<WeatherModel, HourlyDataPoint[]>;
  timezoneInfo: TimezoneInfo | null;
}

// Fetch weather data from Open-Meteo for multiple models
export async function fetchOpenMeteoData(
  latitude: number,
  longitude: number,
  elevation: number,
  models: WeatherModel[],
  variables: WeatherVariable[],
  forecastDays: number = 14,
  timezone: string = 'auto'
): Promise<FetchOpenMeteoDataResult> {
  // DEV MODE: Return mock data for performance testing
  if (isMockModeEnabled()) {
    console.log('[MOCK MODE] Generating mock data for', models.length, 'models');
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return generateMockData(models, variables, forecastDays);
  }

  const params = {
    latitude,
    longitude,
    elevation,
    hourly: variables,
    models,
    forecast_days: forecastDays,
    timezone,
  };

  try {
    const responses = await fetchWeatherApi(OPEN_METEO_URL, params);
    const result = new Map<WeatherModel, HourlyDataPoint[]>();

    // Extract timezone info from first response
    let timezoneInfo: TimezoneInfo | null = null;
    if (responses.length > 0) {
      const firstResponse = responses[0];
      const tz = firstResponse.timezone();
      const tzAbbr = firstResponse.timezoneAbbreviation();
      if (tz && tzAbbr) {
        timezoneInfo = { timezone: tz, timezoneAbbreviation: tzAbbr };
      }
    }

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const modelIndex = i; // Responses come back in same order as models array
      const modelId = models[modelIndex];

      const hourly = response.hourly();
      if (!hourly) continue;

      const timeStart = Number(hourly.time());
      const timeEnd = Number(hourly.timeEnd());
      const interval = hourly.interval();
      const numPoints = (timeEnd - timeStart) / interval;

      const dataPoints: HourlyDataPoint[] = [];

      for (let j = 0; j < numPoints; j++) {
        const timestamp = (timeStart + j * interval) * 1000;
        const time = new Date(timestamp);

        const point: HourlyDataPoint = {
          time,
          timestamp,
        };

        // Extract each variable value
        for (let varIdx = 0; varIdx < variables.length; varIdx++) {
          const varData = hourly.variables(varIdx);
          if (varData) {
            const values = varData.valuesArray();
            if (values && values[j] !== undefined) {
              point[variables[varIdx]] = values[j];
            }
          }
        }

        dataPoints.push(point);
      }

      result.set(modelId, dataPoints);
    }

    return { data: result, timezoneInfo };
  } catch (error) {
    console.error('Error fetching Open-Meteo data:', error);
    throw error;
  }
}

// Calculate median across selected models for a specific variable at each time point
export function calculateModelMedian(
  data: Map<WeatherModel, HourlyDataPoint[]>,
  variable: WeatherVariable
): number[] {
  if (data.size === 0) return [];

  // Get the first model to determine number of data points
  const firstModel = data.values().next().value;
  if (!firstModel || firstModel.length === 0) return [];

  const numPoints = firstModel.length;
  const medians: number[] = [];

  for (let i = 0; i < numPoints; i++) {
    const values: number[] = [];

    for (const [, points] of data) {
      const val = points[i]?.[variable];
      if (typeof val === 'number' && !isNaN(val)) {
        values.push(val);
      }
    }

    if (values.length === 0) {
      medians.push(0);
    } else {
      values.sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);
      const median = values.length % 2 === 0
        ? (values[mid - 1] + values[mid]) / 2
        : values[mid];
      medians.push(median);
    }
  }

  return medians;
}

// Calculate average across selected models for a specific variable at each time point
export function calculateModelAverage(
  data: Map<WeatherModel, HourlyDataPoint[]>,
  variable: WeatherVariable
): number[] {
  if (data.size === 0) return [];

  const firstModel = data.values().next().value;
  if (!firstModel || firstModel.length === 0) return [];

  const numPoints = firstModel.length;
  const averages: number[] = [];

  for (let i = 0; i < numPoints; i++) {
    const values: number[] = [];

    for (const [, points] of data) {
      const val = points[i]?.[variable];
      if (typeof val === 'number' && !isNaN(val)) {
        values.push(val);
      }
    }

    if (values.length === 0) {
      averages.push(0);
    } else {
      const sum = values.reduce((a, b) => a + b, 0);
      averages.push(sum / values.length);
    }
  }

  return averages;
}

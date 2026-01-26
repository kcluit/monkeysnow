import { fetchWeatherApi } from 'openmeteo';
import type { WeatherModel, WeatherVariable, HourlyDataPoint, TimezoneInfo } from '../types/openMeteo';

// Import locations from backend
import locationsData from '../../../backend/locations.json';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

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

// Fetch weather data from Open-Meteo for multiple models
export async function fetchOpenMeteoData(
  latitude: number,
  longitude: number,
  elevation: number,
  models: WeatherModel[],
  variables: WeatherVariable[],
  forecastDays: number = 14,
  timezone: string = 'auto'
): Promise<Map<WeatherModel, HourlyDataPoint[]>> {
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

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const modelIndex = i; // Responses come back in same order as models array
      const modelId = models[modelIndex];

      const hourly = response.hourly();
      if (!hourly) continue;

      const utcOffsetSeconds = response.utcOffsetSeconds();
      const timeStart = Number(hourly.time());
      const timeEnd = Number(hourly.timeEnd());
      const interval = hourly.interval();
      const numPoints = (timeEnd - timeStart) / interval;

      const dataPoints: HourlyDataPoint[] = [];

      for (let j = 0; j < numPoints; j++) {
        const timestamp = (timeStart + j * interval + utcOffsetSeconds) * 1000;
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

    return result;
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

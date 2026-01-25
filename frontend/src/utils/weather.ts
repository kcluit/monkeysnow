import type {
  AllWeatherData,
  ElevationLevel,
  ProcessedResortData,
  DayForecast,
  Period,
  SnowCondition,
  SnowTotals,
  PeriodData,
  DayData,
  TemperatureMetric,
  SnowfallEstimateMode,
  SnowQuality,
  UnitSystem
} from '../types';
import {
  formatTempWithRounding,
  formatSnow,
  formatRain,
  formatWind,
  formatElevation,
  formatFreezingLevel
} from './unitConversion';

const API_URL = 'http://localhost:1234';

export async function fetchAllData(): Promise<AllWeatherData> {
  try {
    const response = await fetch(`${API_URL}/all`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Error fetching weather data:', err);
    throw err;
  }
}

export function processResortData(
  allData: AllWeatherData,
  resortName: string,
  elevation: ElevationLevel = 'bot',
  temperatureMetric: TemperatureMetric = 'max',
  snowfallEstimateMode: SnowfallEstimateMode = 'model',
  unitSystem: UnitSystem = 'metric'
): ProcessedResortData | null {
  try {
    if (!allData || !allData.data) {
      console.warn('Missing weather data');
      return null;
    }

    const resortData = allData.data[resortName];
    if (!resortData) {
      console.warn(`Resort data not found for ${resortName}`);
      return null;
    }

    const elevationData = resortData[elevation];
    if (!elevationData || !elevationData.forecast) {
      console.warn(`Elevation data not found for ${resortName} at ${elevation}`);
      return null;
    }

    const days: DayForecast[] = [];
    const daysInWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Get sorted date keys from the forecast
    const dateKeys = Object.keys(elevationData.forecast).sort();

    for (const dateKey of dateKeys) {
      const dayData = elevationData.forecast[dateKey];
      if (!dayData) continue;

      const date = new Date(dateKey);
      // Use getUTCDay() to match the date string from backend (which is in UTC)
      const dayName = daysInWeek[date.getUTCDay()];
      // Format date as "Jan 25" for optional display
      const dateDisplay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

      // Create periods from AM/PM/NIGHT data
      const periods = createPeriodsFromDayData(dayData, temperatureMetric, snowfallEstimateMode, unitSystem);

      // Get snow condition from periods' snow quality (use first available with precipitation)
      const snowCondition = getSnowConditionFromPeriods(periods);

      // Get the highest freezing level from all periods
      const freezingLevels = [
        dayData.AM?.freezing_level,
        dayData.PM?.freezing_level,
        dayData.NIGHT?.freezing_level
      ].filter((level): level is number => typeof level === 'number' && !isNaN(level));
      const highestFreezingLevel = freezingLevels.length > 0 ? Math.max(...freezingLevels) : null;

      // Get main weather condition from first available period
      const mainWeatherCode = dayData.AM?.weather_code ?? dayData.PM?.weather_code ?? dayData.NIGHT?.weather_code ?? 0;
      const mainCondition = getWeatherDescription(mainWeatherCode);

      days.push({
        name: dayName,
        date: dateDisplay,
        weather: mainCondition,
        weatherEmoji: getWeatherEmoji(mainCondition),
        periods,
        freezingLevel: formatFreezingLevel(highestFreezingLevel, unitSystem),
        snowCondition
      });
    }

    if (days.length === 0) {
      console.warn(`No forecast days found for ${resortName}`);
      return null;
    }

    return {
      name: resortName.replace(/-/g, ' '),
      elevation: formatElevation(elevationData.metadata.elevation, unitSystem),
      days
    };
  } catch (err) {
    console.error(`Error processing resort data for ${resortName}:`, err);
    return null;
  }
}

function createPeriodsFromDayData(dayData: DayData, temperatureMetric: TemperatureMetric, snowfallEstimateMode: SnowfallEstimateMode, unitSystem: UnitSystem): Period[] {
  const periods: Period[] = [];

  const periodOrder: Array<{ key: keyof DayData; label: string }> = [
    { key: 'AM', label: 'AM' },
    { key: 'PM', label: 'PM' },
    { key: 'NIGHT', label: 'Night' }
  ];

  for (const { key, label } of periodOrder) {
    const periodData = dayData[key];
    if (periodData) {
      periods.push(createPeriodFromData(periodData, label, temperatureMetric, snowfallEstimateMode, unitSystem));
    }
  }

  return periods;
}

function getTemperatureByMetric(data: PeriodData, metric: TemperatureMetric): number {
  switch (metric) {
    case 'max':
      return data.temperature_max ?? 0;
    case 'min':
      return data.temperature_min ?? 0;
    case 'avg':
      return data.temperature_avg ?? 0;
    case 'median':
      return data.temperature_median ?? 0;
    default:
      return data.temperature_max ?? 0;
  }
}

function createPeriodFromData(data: PeriodData, label: string, temperatureMetric: TemperatureMetric, snowfallEstimateMode: SnowfallEstimateMode): Period {
  const displayTemp = getTemperatureByMetric(data, temperatureMetric);
  // Round based on metric: ceil for max, floor for min, round for avg/median
  const roundedTemp = temperatureMetric === 'max' ? Math.ceil(displayTemp)
                    : temperatureMetric === 'min' ? Math.floor(displayTemp)
                    : Math.round(displayTemp);

  const snowQuality = data.snow_quality ?? 'rain';
  let snowValue: number;
  let rainValue: number;

  // Snow and rain don't coexist - use snow_quality to decide which to show
  if (snowQuality === 'rain') {
    // It's rain - show rain, zero snow
    snowValue = 0;
    if (snowfallEstimateMode === 'totalPrecip') {
      // In totalPrecip mode, convert estimate cm back to mm
      rainValue = (data.snowfall_estimate ?? 0) * 10;
    } else {
      // Model mode - use backend's rain_total
      rainValue = data.rain_total ?? 0;
    }
  } else {
    // It's snow - show snow, zero rain
    rainValue = 0;
    if (snowfallEstimateMode === 'totalPrecip') {
      snowValue = data.snowfall_estimate ?? 0;
    } else {
      // Model mode - use backend's snowfall_total
      snowValue = data.snowfall_total ?? 0;
    }
  }

  return {
    time: label,
    temp: `${roundedTemp}°C`,
    tempMax: data.temperature_max ?? 0,
    tempMin: data.temperature_min ?? 0,
    tempAvg: data.temperature_avg ?? 0,
    tempMedian: data.temperature_median ?? 0,
    snow: `${snowValue.toFixed(1)} cm`,
    rain: `${rainValue.toFixed(1)} mm`,
    wind: `${Math.round(data.wind_speed ?? 0)} km/h`,
    condition: getWeatherDescription(data.weather_code ?? 0),
    snowQuality,
    snowToLiquidRatio: data.snow_to_liquid_ratio ?? 0
  };
}

// WMO Weather Code to description mapping
function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  return descriptions[code] || 'Unknown';
}

function getWeatherEmoji(condition: string): string {
  if (!condition) return '⛅';
  const lowerCondition = condition.toLowerCase();

  if (lowerCondition.includes('snow')) return '❄️';
  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) return '🌧️';
  if (lowerCondition.includes('clear')) return '☀️';
  if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) return '☁️';
  if (lowerCondition.includes('fog')) return '🌫️';
  if (lowerCondition.includes('thunder')) return '⛈️';
  return '⛅';
}

/**
 * Maps snow quality from API to display text and rainbow status
 */
function getSnowConditionFromQuality(quality: SnowQuality): SnowCondition {
  switch (quality) {
    case 'powder':
      return { text: 'Powder!', isRainbow: true };
    case 'dry_snow':
      return { text: 'Dry Snow', isRainbow: true };
    case 'wet_snow':
      return { text: 'Wet Snow', isRainbow: false };
    case 'sleet/mix':
      return { text: 'Sleet/Mix', isRainbow: false };
    case 'rain':
      return { text: 'Rain', isRainbow: false };
    default:
      return { text: 'Mixed conditions', isRainbow: false };
  }
}

/**
 * Gets the dominant snow condition from periods (prefers periods with precipitation)
 */
function getSnowConditionFromPeriods(periods: Period[]): SnowCondition {
  if (periods.length === 0) {
    return { text: 'Mixed conditions', isRainbow: false };
  }

  // Find periods with snow and get the best quality (powder is best, rain is worst)
  const qualityPriority: SnowQuality[] = ['powder', 'dry_snow', 'wet_snow', 'sleet/mix', 'rain'];

  // Get all qualities from periods with precipitation
  const periodsWithPrecip = periods.filter(p => parseFloat(p.snow) > 0 || parseFloat(p.rain) > 0);

  if (periodsWithPrecip.length === 0) {
    // No precipitation - use first period's quality or default
    return getSnowConditionFromQuality(periods[0].snowQuality);
  }

  // Find the worst (lowest priority) quality among periods with precipitation
  let worstQuality: SnowQuality = 'powder';
  let worstPriorityIndex = -1;

  for (const period of periodsWithPrecip) {
    const priorityIndex = qualityPriority.indexOf(period.snowQuality);
    if (priorityIndex !== -1 && priorityIndex > worstPriorityIndex) {
      worstPriorityIndex = priorityIndex;
      worstQuality = period.snowQuality;
    }
  }

  return getSnowConditionFromQuality(worstQuality);
}

export function calculateSnowTotals(resort: ProcessedResortData | null): SnowTotals {
  if (!resort || !resort.days) return { next3Days: 0, next7Days: 0 };

  const next3Days = resort.days.slice(0, 3);
  const next7Days = resort.days.slice(0, 7);

  const calculate = (days: DayForecast[]): number => {
    return days.reduce((total, day) => {
      const dayTotal = day.periods.reduce((daySum, period) => {
        const snowValue = period.snow.toString().replace(/[^\d.-]/g, '');
        const snow = parseFloat(snowValue) || 0;
        return daySum + snow;
      }, 0);
      return total + dayTotal;
    }, 0);
  };

  return {
    next3Days: Math.round(calculate(next3Days)),
    next7Days: Math.round(calculate(next7Days))
  };
}

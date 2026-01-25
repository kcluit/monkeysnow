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
  TemperatureMetric
} from '../types';

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
  temperatureMetric: TemperatureMetric = 'max'
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
      const dayName = daysInWeek[date.getDay()];

      // Get the highest freezing level from all periods
      const freezingLevels = [
        dayData.AM?.freezing_level,
        dayData.PM?.freezing_level,
        dayData.NIGHT?.freezing_level
      ].filter((level): level is number => typeof level === 'number' && !isNaN(level));

      const highestFreezingLevel = freezingLevels.length > 0 ? Math.max(...freezingLevels) : null;
      const baseElevation = elevationData.metadata.elevation;
      const snowCondition = getSnowCondition(highestFreezingLevel, baseElevation);

      // Create periods from AM/PM/NIGHT data
      const periods = createPeriodsFromDayData(dayData, temperatureMetric);

      // Get main weather condition from first available period
      const mainWeatherCode = dayData.AM?.weather_code ?? dayData.PM?.weather_code ?? dayData.NIGHT?.weather_code ?? 0;
      const mainCondition = getWeatherDescription(mainWeatherCode);

      days.push({
        name: dayName,
        weather: mainCondition,
        weatherEmoji: getWeatherEmoji(mainCondition),
        periods,
        freezingLevel: highestFreezingLevel ? `${Math.round(highestFreezingLevel)} m` : '- m',
        snowCondition
      });
    }

    if (days.length === 0) {
      console.warn(`No forecast days found for ${resortName}`);
      return null;
    }

    return {
      name: resortName.replace(/-/g, ' '),
      elevation: `${Math.round(elevationData.metadata.elevation)}m`,
      days
    };
  } catch (err) {
    console.error(`Error processing resort data for ${resortName}:`, err);
    return null;
  }
}

function createPeriodsFromDayData(dayData: DayData): Period[] {
  const periods: Period[] = [];

  const periodOrder: Array<{ key: keyof DayData; label: string }> = [
    { key: 'AM', label: 'AM' },
    { key: 'PM', label: 'PM' },
    { key: 'NIGHT', label: 'Night' }
  ];

  for (const { key, label } of periodOrder) {
    const periodData = dayData[key];
    if (periodData) {
      periods.push(createPeriodFromData(periodData, label));
    }
  }

  return periods;
}

function createPeriodFromData(data: PeriodData, label: string): Period {
  return {
    time: label,
    temp: `${Math.round(data.temperature_avg ?? 0)}°C`,
    snow: `${(data.snowfall_total ?? 0).toFixed(1)} cm`,
    rain: `${(data.rain_total ?? 0).toFixed(1)} mm`,
    wind: `${Math.round(data.wind_speed ?? 0)} km/h`,
    condition: getWeatherDescription(data.weather_code ?? 0)
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

function getSnowCondition(freezingLevel: number | null, baseElevation: number): SnowCondition {
  if (!freezingLevel || !baseElevation) return { text: 'Mixed conditions', isRainbow: false };

  const difference = freezingLevel - baseElevation;

  if (freezingLevel < baseElevation) {
    return { text: 'Dry, Powder Snow!', isRainbow: true };
  } else if (difference <= 200) {
    return { text: 'Icy or Sticky Snow', isRainbow: false };
  } else {
    return { text: 'Wet, Slushy Snow', isRainbow: false };
  }
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

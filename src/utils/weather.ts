import type {
  AllWeatherData,
  ElevationDataKey,
  ProcessedResortData,
  DayForecast,
  Period,
  SnowCondition,
  SnowTotals
} from '../types';

export async function fetchAllData(): Promise<AllWeatherData> {
  try {
    const response = await fetch('https://snowscraper.camdvr.org/all');

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
  elevation: ElevationDataKey = 'botData'
): ProcessedResortData | null {
  try {
    // Check if elevation data exists
    if (!allData || !allData[elevation] || !allData[elevation].resorts) {
      console.warn(`Missing elevation data for ${elevation}`);
      return null;
    }

    const resortData = allData[elevation].resorts.find(r => r.resort === resortName);
    if (!resortData || !resortData.data) {
      console.warn(`Resort data not found for ${resortName} at ${elevation} elevation`);
      return null;
    }

    const data = resortData.data;
    if (!data.success) {
      console.warn(`Data object unsuccessful for ${resortName}`);
      return null;
    }

    const days: DayForecast[] = [];
    const daysInWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    let currentDayIndex = today.getDay();

    // Check if first day has only one period and it's between 12 AM - 6 AM
    const currentHour = today.getHours();
    const isEarlyMorning = currentHour >= 0 && currentHour < 6;
    const firstDayHasOnePeriod = data.temperatureBlocks[0]?.length === 1;

    // If it's early morning and first day has one period, treat it as previous day's night forecast
    if (isEarlyMorning && firstDayHasOnePeriod) {
      currentDayIndex = (currentDayIndex - 1 + 7) % 7; // Go back one day
    }

    for (let i = 0; i < data.temperatureBlocks.length; i++) {
      const dayIndex = (currentDayIndex + i) % 7;
      const mainCondition = data.phrasesBlocks[i]?.[0] || '';
      const highestFreezingLevel = getHighestFreezingLevel(data.freezinglevelBlocks[i]);
      const snowCondition = getSnowCondition(highestFreezingLevel, data.bottomElevation);

      days.push({
        name: daysInWeek[dayIndex],
        weather: mainCondition,
        weatherEmoji: getWeatherEmoji(mainCondition),
        periods: createPeriods(
          data.temperatureBlocks[i],
          data.snowBlocks[i],
          data.rainBlocks[i],
          data.windBlocks[i],
          data.phrasesBlocks[i]
        ),
        freezingLevel: `${highestFreezingLevel || '-'} m`,
        snowCondition
      });
    }

    if (days.length === 0) {
      console.warn(`No forecast days found for ${resortName}`);
      return null;
    }

    return {
      name: resortName.replace(/-/g, ' '),
      elevation: data.bottomElevation ? `${data.bottomElevation}m` : 'N/A',
      days
    };
  } catch (err) {
    console.error(`Error processing resort data for ${resortName}:`, err);
    return null;
  }
}

function getHighestFreezingLevel(levels: number[] | undefined): number | null {
  if (!levels || !levels.length) return null;
  const validLevels = levels.filter(level => typeof level === 'number' && !isNaN(level));
  return validLevels.length > 0 ? Math.max(...validLevels) : null;
}

function getWeatherEmoji(condition: string): string {
  if (!condition) return '⛅';
  const lowerCondition = condition.toLowerCase();

  if (lowerCondition.includes('snow')) return '❄️';
  if (lowerCondition.includes('rain')) return '🌧️';
  if (lowerCondition.includes('clear')) return '☀️';
  if (lowerCondition.includes('cloud')) return '☁️';
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

function createPeriods(
  tempBlock: number[] | undefined,
  snowBlock: number[] | undefined,
  rainBlock: number[] | undefined,
  windBlock: number[] | undefined,
  phraseBlock: string[] | undefined
): Period[] {
  if (!tempBlock || !tempBlock.length) return [];

  const periods: Period[] = [];
  const totalPeriods = tempBlock.length;

  for (let i = 0; i < totalPeriods; i++) {
    periods.push({
      time: getPeriodLabel(i, totalPeriods),
      temp: `${tempBlock[i]}°C`,
      snow: `${snowBlock?.[i] || '-'} cm`,
      rain: `${(rainBlock?.[i] ?? 0) * 10 || '-'} mm`,
      wind: `${windBlock?.[i] || '-'} km/h`,
      condition: phraseBlock?.[i] || 'Unknown'
    });
  }

  return periods;
}

function getPeriodLabel(index: number, totalPeriods: number): string {
  if (totalPeriods === 1) {
    return 'Night';
  } else if (totalPeriods === 2) {
    return index === 0 ? 'PM' : 'Night';
  } else if (totalPeriods === 3) {
    return ['AM', 'PM', 'Night'][index];
  }
  return `Period ${index + 1}`;
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

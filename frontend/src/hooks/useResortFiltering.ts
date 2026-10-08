import { useState, useMemo, useCallback } from 'react';
import { processResortData } from '../utils/weather';
import { RESORT_LOCATIONS } from '../data/resortLocations';
import type {
  AllWeatherData,
  ElevationLevel,
  SortOption,
  SortDay,
  UseResortFilteringReturn,
  DayForecast,
  Period,
  TemperatureMetric,
  SnowfallEstimateMode,
  UnitSystem
} from '../types';

/** Whether the cards run from the smallest value up: sortResorts puts the coldest first, but the most snow and wind first, until the order is reversed */
export function isAscendingOrder(sortBy: SortOption, isReversed: boolean): boolean {
  return (sortBy === 'temperature') !== isReversed;
}

export function useResortFiltering(
  skiResorts: string[],
  allWeatherData: AllWeatherData | null
): UseResortFilteringReturn {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredResorts = useMemo(() => {
    if (!searchTerm) return skiResorts;

    const normalizedSearch = searchTerm.toLowerCase();
    return skiResorts.filter(resort => {
      const location = RESORT_LOCATIONS.get(resort);
      const names = location ? [location.displayName, ...(location.aka ?? [])] : [resort.replace(/-/g, ' ')];
      return names.some(name => name.toLowerCase().includes(normalizedSearch));
    });
  }, [skiResorts, searchTerm]);

  const sortResorts = useCallback((
    resorts: string[],
    sortBy: SortOption,
    selectedElevation: ElevationLevel,
    selectedSortDay: SortDay,
    isReversed: boolean,
    temperatureMetric: TemperatureMetric = 'max',
    snowfallEstimateMode: SnowfallEstimateMode = 'model',
    unitSystem: UnitSystem = 'metric'
  ): string[] => {
    if (!allWeatherData) return resorts;

    // Helper function to get temperature based on metric
    const getTempForDay = (day: DayForecast, metric: TemperatureMetric): number => {
      const periods = day.periods;
      if (!periods.length) return -Infinity;

      switch (metric) {
        case 'max':
          // Max of all period maxes (true daily maximum)
          return Math.max(...periods.map(p => p.tempMax));
        case 'min':
          // Min of all period mins (true daily minimum)
          return Math.min(...periods.map(p => p.tempMin));
        case 'avg':
          // Average of all period averages
          return periods.reduce((sum, p) => sum + p.tempAvg, 0) / periods.length;
        case 'median':
          // Average of all period medians
          return periods.reduce((sum, p) => sum + p.tempMedian, 0) / periods.length;
        default:
          return Math.max(...periods.map(p => p.tempMax));
      }
    };


    const getTotalSnow = (day: DayForecast): number => {
      return day.periods.reduce((sum: number, period: Period) => sum + period.snowCm, 0);
    };

    const getPMWind = (day: DayForecast): number => {
      const pmPeriod = day.periods.find((p: Period) => p.time === 'PM');
      const nightPeriod = day.periods.find((p: Period) => p.time === 'Night');

      return pmPeriod !== undefined
        ? pmPeriod.windKmh
        : (nightPeriod !== undefined ? nightPeriod.windKmh : 0);
    };

    const getAvgTempMultipleDays = (days: DayForecast[], numDays: number): number => {
      const selectedDays = days.slice(0, Math.min(numDays, days.length));
      if (selectedDays.length === 0) return 0;

      let totalTemp = 0;
      selectedDays.forEach(day => {
        const dayTemp = getTempForDay(day, temperatureMetric);
        totalTemp += (dayTemp === -Infinity ? 0 : dayTemp);
      });
      return totalTemp / selectedDays.length;
    };

    const getTotalSnowMultipleDays = (days: DayForecast[], numDays: number): number => {
      const selectedDays = days.slice(0, Math.min(numDays, days.length));
      return selectedDays.reduce((total, day) => {
        return total + getTotalSnow(day);
      }, 0);
    };

    const getSumWindMultipleDays = (days: DayForecast[], numDays: number): number => {
      const selectedDays = days.slice(0, Math.min(numDays, days.length));

      return selectedDays.reduce((total, day) => {
        return total + getPMWind(day);
      }, 0);
    };

    // PRE-COMPUTE all resort data ONCE to avoid O(N log N) calls to expensive processResortData
    // This reduces complexity from O(N log N × D × P) to O(N × D × P)
    const resortDataMap = new Map<string, ReturnType<typeof processResortData>>();
    for (const resort of resorts) {
      resortDataMap.set(resort, processResortData(allWeatherData, resort, selectedElevation, temperatureMetric, snowfallEstimateMode, unitSystem));
    }

    // Resorts without a forecast for the sort day (still queued, failed, or a shorter model) go last:
    // a comparator calling them equal to every other resort would scramble the order of the rest
    const canCompare = (resort: string): boolean => {
      const resortData = resortDataMap.get(resort);
      return Boolean(resortData && (typeof selectedSortDay === 'string' || resortData.days[selectedSortDay]));
    };
    const withoutData = resorts.filter((resort) => !canCompare(resort));

    let sortedResorts = resorts.filter(canCompare).sort((a, b) => {
      const resortDataA = resortDataMap.get(a);  // O(1) lookup
      const resortDataB = resortDataMap.get(b);  // O(1) lookup

      if (!resortDataA || !resortDataB) return 0;

      // Handle multi-day aggregation sorting
      if (typeof selectedSortDay === 'string') {
        const numDays = selectedSortDay === 'next3days' ? 3 : 7;

        switch (sortBy) {
          case 'temperature':
            return getAvgTempMultipleDays(resortDataA.days, numDays) - getAvgTempMultipleDays(resortDataB.days, numDays);
          case 'snowfall':
            return getTotalSnowMultipleDays(resortDataB.days, numDays) - getTotalSnowMultipleDays(resortDataA.days, numDays);
          case 'wind':
            return getSumWindMultipleDays(resortDataB.days, numDays) - getSumWindMultipleDays(resortDataA.days, numDays);
          default:
            return 0;
        }
      }

      // Handle single day sorting (existing logic)
      const dayA = resortDataA.days[selectedSortDay];
      const dayB = resortDataB.days[selectedSortDay];

      if (!dayA || !dayB) return 0;

      switch (sortBy) {
        case 'temperature':
          return getTempForDay(dayA, temperatureMetric) - getTempForDay(dayB, temperatureMetric);
        case 'snowfall':
          return getTotalSnow(dayB) - getTotalSnow(dayA);
        case 'wind':
          return getPMWind(dayB) - getPMWind(dayA);
        default:
          return 0;
      }
    });

    // Apply reverse order if enabled
    if (isReversed) {
      sortedResorts = sortedResorts.reverse();
    }

    return [...sortedResorts, ...withoutData];
  }, [allWeatherData]);

  return {
    searchTerm,
    setSearchTerm,
    filteredResorts,
    sortResorts
  };
}

import { useState, useMemo, useCallback } from 'react';
import { processResortData } from '../utils/weather';
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

export function useResortFiltering(
  skiResorts: string[],
  allWeatherData: AllWeatherData | null
): UseResortFilteringReturn {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredResorts = useMemo(() => {
    if (!searchTerm) return skiResorts;

    const normalizedSearch = searchTerm.toLowerCase();
    return skiResorts.filter(resort => {
      const displayName = resort.replace(/-/g, ' ').toLowerCase();
      return displayName.includes(normalizedSearch);
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
      return day.periods.reduce((sum: number, period: Period) => {
        const snow = parseFloat(period.snow) || 0;
        return sum + snow;
      }, 0);
    };

    const getPMWind = (day: DayForecast): number => {
      const pmPeriod = day.periods.find((p: Period) => p.time === 'PM');
      const nightPeriod = day.periods.find((p: Period) => p.time === 'Night');

      return pmPeriod !== undefined
        ? parseFloat(pmPeriod.wind)
        : (nightPeriod !== undefined ? parseFloat(nightPeriod.wind) : 0);
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

    let sortedResorts = [...resorts].sort((a, b) => {
      const resortDataA = processResortData(allWeatherData, a, selectedElevation, temperatureMetric, snowfallEstimateMode);
      const resortDataB = processResortData(allWeatherData, b, selectedElevation, temperatureMetric, snowfallEstimateMode);

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

    return sortedResorts;
  }, [allWeatherData]);

  return {
    searchTerm,
    setSearchTerm,
    filteredResorts,
    sortResorts
  };
}

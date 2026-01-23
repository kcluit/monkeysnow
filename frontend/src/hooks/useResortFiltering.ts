import { useState, useMemo, useCallback } from 'react';
import { processResortData } from '../utils/weather';
import type {
  AllWeatherData,
  ElevationLevel,
  SortOption,
  SortDay,
  UseResortFilteringReturn,
  DayForecast,
  Period
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
    isReversed: boolean
  ): string[] => {
    if (!allWeatherData) return resorts;

    const elevation: ElevationDataKey = selectedElevation === 'bot' ? 'botData' : selectedElevation === 'mid' ? 'midData' : 'topData';

    // Helper functions for single day calculations
    const getMaxTemp = (day: DayForecast): number => {
      return Math.max(
        ...day.periods.map((period: Period) => {
          const temp = parseFloat(period.temp);
          return isNaN(temp) ? -Infinity : temp;
        })
      );
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

      let totalMaxTemp = 0;
      selectedDays.forEach(day => {
        const dayMaxTemp = getMaxTemp(day);
        totalMaxTemp += (dayMaxTemp === -Infinity ? 0 : dayMaxTemp);
      });
      return totalMaxTemp / selectedDays.length;
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
      const resortDataA = processResortData(allWeatherData, a, elevation);
      const resortDataB = processResortData(allWeatherData, b, elevation);

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
          return getMaxTemp(dayA) - getMaxTemp(dayB);
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

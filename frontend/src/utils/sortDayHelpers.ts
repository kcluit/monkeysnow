/**
 * Shared utilities for sort day functionality.
 * Used by UtilityBar, CompactUtilityBar, and App.tsx.
 */

import type { SortDay, SortDayData, ElevationLevel, AllWeatherData, ProcessedResortData } from '../types';

/** Default special options for sort day dropdown */
export const SORT_DAY_SPECIAL_OPTIONS = [
  { name: "Next 3 Days", value: "next3days" },
  { name: "Next 7 Days", value: "next7days" }
] as const;

/**
 * Get sort day options including special aggregate options and regular days.
 */
export function getSortDayData(
  selectedResorts: string[],
  allWeatherData: AllWeatherData | null,
  processResortData: (
    allData: AllWeatherData,
    resortName: string,
    elevation: ElevationLevel
  ) => ProcessedResortData | null,
  selectedElevation: ElevationLevel
): SortDayData {
  const specialOptions = [...SORT_DAY_SPECIAL_OPTIONS];

  if (selectedResorts.length === 0 || !allWeatherData) {
    return { specialOptions, regularDays: [] };
  }

  const firstResort = selectedResorts[0];
  const resortData = processResortData(allWeatherData, firstResort, selectedElevation);

  return {
    specialOptions,
    regularDays: resortData?.days || []
  };
}

/**
 * Get display text for the selected sort day.
 */
export function getSortDayText(
  selectedSortDay: SortDay,
  sortDayData: SortDayData
): string {
  if (typeof selectedSortDay === 'string') {
    const specialOption = sortDayData.specialOptions.find(opt => opt.value === selectedSortDay);
    return specialOption?.name || 'Today';
  }
  return sortDayData.regularDays[selectedSortDay]?.name || 'Today';
}

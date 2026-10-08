/**
 * Shared utilities for sort day functionality.
 * Used by UtilityBar, CompactUtilityBar, and App.tsx.
 */

import type { SortDay, SortDayData, ElevationLevel, AllWeatherData, ProcessedResortData, DayForecast } from '../types';

/** Default special options for sort day dropdown */
export const SORT_DAY_SPECIAL_OPTIONS = [
  { name: "Next 3 Days", value: "next3days" },
  { name: "Next 7 Days", value: "next7days" }
] as const;

/** From a week on, weekday names repeat, so those days are labelled with their date too */
const DAYS_IN_WEEK = 7;

const dayLabel = (day: DayForecast, index: number, showDate: boolean): string =>
  showDate || index >= DAYS_IN_WEEK ? `${day.name} ${day.date}` : day.name;

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
  selectedElevation: ElevationLevel,
  showDate: boolean
): SortDayData {
  const specialOptions = [...SORT_DAY_SPECIAL_OPTIONS];

  if (selectedResorts.length === 0 || !allWeatherData) {
    return { specialOptions, regularDays: [] };
  }

  // The days of the resort whose forecast reaches furthest, as Card models' Ranges differ.
  // Resorts still queued have no forecast to count.
  let longestResort: string | null = null;
  let mostDays = 0;
  for (const resort of selectedResorts) {
    const days = Object.keys(allWeatherData.data[resort]?.[selectedElevation]?.forecast ?? {}).length;
    if (days > mostDays) {
      longestResort = resort;
      mostDays = days;
    }
  }
  if (!longestResort) {
    return { specialOptions, regularDays: [] };
  }
  const resortData = processResortData(allWeatherData, longestResort, selectedElevation);

  return {
    specialOptions,
    regularDays: (resortData?.days ?? []).map((day, index) => dayLabel(day, index, showDate))
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
  return sortDayData.regularDays[selectedSortDay] || 'Today';
}

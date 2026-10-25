/**
 * Shared utilities for sort day functionality.
 * Used by UtilityBar, CompactUtilityBar, and App.tsx.
 */

import { daysFromToday } from './weather';
import { translate } from '../locales';
import type { SortDay, SortDayData, SortDayOption, ElevationLevel, AllWeatherData, ProcessedResortData, DayForecast } from '../types';

/*
 * App keeps the sort day options across a change of language, and the Settings page and the
 * command palette read them too, so every name here is a getter, in the language shown when read.
 */
const option = (value: string, name: () => string): SortDayOption => ({ value, get name() { return name(); } });

/** Default special options for sort day dropdown */
function forecastSpecialOptions(): SortDayOption[] {
  return [
    option("next3days", () => translate('sortDay.next3Days')),
    option("next7days", () => translate('sortDay.next7Days')),
  ];
}

/** History's: the latest 3 and 7 days, and every day it shows, each only where it differs from a shorter one */
function historySpecialOptions(historyLength: number): SortDayOption[] {
  return [
    option("next3days", () => translate('sortDay.past3Days')),
    ...(historyLength >= 7 ? [option("next7days", () => translate('sortDay.past7Days'))] : []),
    ...(historyLength > 7 ? [option("allDays", () => translate('sortDay.pastDays', { count: historyLength }))] : []),
  ];
}

/**
 * The sort day History sorts by at this History length: one it doesn't offer, kept from a
 * longer History length, falls back to the latest 3 days until that length comes back.
 */
export function historySortDayWithin(sortDay: SortDay, historyLength: number): SortDay {
  const offered = typeof sortDay === 'number'
    ? sortDay < historyLength
    : historySpecialOptions(historyLength).some((option) => option.value === sortDay);
  return offered ? sortDay : 'next3days';
}

/** From a week on, weekday names repeat, so those days are labelled with their date too */
const DAYS_IN_WEEK = 7;

const dayLabel = (day: DayForecast, index: number, showDate: boolean): string =>
  showDate || index >= DAYS_IN_WEEK ? `${day.name} ${day.date}` : day.name;

/**
 * Get sort day options including special aggregate options and regular days.
 * With a History length, they are History's, its days from today back.
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
  showDate: boolean,
  historyLength?: number
): SortDayData {
  const specialOptions: SortDayOption[] = historyLength === undefined
    ? forecastSpecialOptions()
    : historySpecialOptions(historyLength);

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
  const days = resortData ? daysFromToday(resortData) : [];

  return {
    specialOptions,
    // A getter, as the names above are: each day's name and date are written as they're read
    get regularDays() {
      return days.map((day, index) => dayLabel(day, index, showDate));
    }
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
    return specialOption?.name || translate('sortDay.today');
  }
  return sortDayData.regularDays[selectedSortDay] || translate('sortDay.today');
}

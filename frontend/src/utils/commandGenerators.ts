/**
 * Command generators for dynamic command palette integration.
 * Generates commands with checkmarks based on current state.
 */

import type { Command, ElevationLevel, SortOption, SortDay, SortDayData, ViewMode, TemperatureMetric } from '../types';

export interface ControlCommandParams {
  // Elevation
  selectedElevation: ElevationLevel;
  setSelectedElevation: (e: ElevationLevel) => void;
  // Sort
  selectedSort: SortOption;
  setSelectedSort: (s: SortOption) => void;
  // Sort Day
  selectedSortDay: SortDay;
  setSelectedSortDay: (d: SortDay) => void;
  sortDayData: SortDayData;
  // Order
  isReversed: boolean;
  setIsReversed: (r: boolean) => void;
  // View Mode
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  // Temperature Metric
  selectedTemperatureMetric: TemperatureMetric;
  setSelectedTemperatureMetric: (m: TemperatureMetric) => void;
  // Utility Bar visibility
  showUtilityBar: boolean;
  setShowUtilityBar: (show: boolean) => void;
  // Resort selector
  openResortSelector: () => void;
}

/**
 * Generate elevation submenu commands with checkmarks.
 */
export function generateElevationCommands(
  selectedElevation: ElevationLevel,
  setSelectedElevation: (e: ElevationLevel) => void
): Command[] {
  return [
    {
      id: 'elevation-bot',
      name: 'Base Forecast',
      icon: selectedElevation === 'bot' ? '✓' : '',
      action: () => setSelectedElevation('bot'),
    },
    {
      id: 'elevation-mid',
      name: 'Mid Forecast',
      icon: selectedElevation === 'mid' ? '✓' : '',
      action: () => setSelectedElevation('mid'),
    },
    {
      id: 'elevation-top',
      name: 'Peak Forecast',
      icon: selectedElevation === 'top' ? '✓' : '',
      action: () => setSelectedElevation('top'),
    },
  ];
}

/**
 * Generate sort option submenu commands with checkmarks.
 */
export function generateSortCommands(
  selectedSort: SortOption,
  setSelectedSort: (s: SortOption) => void
): Command[] {
  return [
    {
      id: 'sort-temperature',
      name: 'Sort by Temperature',
      icon: selectedSort === 'temperature' ? '✓' : '',
      action: () => setSelectedSort('temperature'),
    },
    {
      id: 'sort-snowfall',
      name: 'Sort by Snowfall',
      icon: selectedSort === 'snowfall' ? '✓' : '',
      action: () => setSelectedSort('snowfall'),
    },
    {
      id: 'sort-wind',
      name: 'Sort by Wind',
      icon: selectedSort === 'wind' ? '✓' : '',
      action: () => setSelectedSort('wind'),
    },
  ];
}

/**
 * Generate sort day submenu commands with checkmarks.
 */
export function generateSortDayCommands(
  selectedSortDay: SortDay,
  setSelectedSortDay: (d: SortDay) => void,
  sortDayData: SortDayData
): Command[] {
  const commands: Command[] = [];

  // Special aggregate options (Next 3 Days, Next 7 Days)
  for (const option of sortDayData.specialOptions) {
    commands.push({
      id: `sortday-${option.value}`,
      name: option.name,
      icon: selectedSortDay === option.value ? '✓' : '',
      action: () => setSelectedSortDay(option.value as SortDay),
    });
  }

  // Regular day options (Today, Tomorrow, etc.)
  sortDayData.regularDays.forEach((day, index) => {
    commands.push({
      id: `sortday-${index}`,
      name: day.name,
      icon: selectedSortDay === index ? '✓' : '',
      action: () => setSelectedSortDay(index),
    });
  });

  return commands;
}

/**
 * Generate order toggle submenu commands with checkmarks.
 */
export function generateOrderCommands(
  isReversed: boolean,
  setIsReversed: (r: boolean) => void
): Command[] {
  return [
    {
      id: 'order-normal',
      name: 'Normal Order',
      icon: !isReversed ? '✓' : '',
      action: () => setIsReversed(false),
    },
    {
      id: 'order-reverse',
      name: 'Reverse Order',
      icon: isReversed ? '✓' : '',
      action: () => setIsReversed(true),
    },
  ];
}

/**
 * Generate view mode submenu commands with checkmarks.
 */
export function generateViewModeCommands(
  viewMode: ViewMode,
  setViewMode: (m: ViewMode) => void
): Command[] {
  return [
    {
      id: 'viewmode-default',
      name: 'Default',
      icon: viewMode === 'default' ? '✓' : '',
      action: () => setViewMode('default'),
    },
    {
      id: 'viewmode-full',
      name: 'Full',
      icon: viewMode === 'full' ? '✓' : '',
      action: () => setViewMode('full'),
    },
    {
      id: 'viewmode-compact',
      name: 'Compact',
      icon: viewMode === 'compact' ? '✓' : '',
      action: () => setViewMode('compact'),
    },
  ];
}

/**
 * Generate utility bar visibility submenu commands with checkmarks.
 */
export function generateUtilityBarCommands(
  showUtilityBar: boolean,
  setShowUtilityBar: (show: boolean) => void
): Command[] {
  return [
    {
      id: 'utilitybar-show',
      name: 'Show',
      icon: showUtilityBar ? '✓' : '',
      action: () => setShowUtilityBar(true),
    },
    {
      id: 'utilitybar-hide',
      name: 'Hide',
      icon: !showUtilityBar ? '✓' : '',
      action: () => setShowUtilityBar(false),
    },
  ];
}

/**
 * Generate temperature metric submenu commands with checkmarks.
 */
export function generateTemperatureMetricCommands(
  selectedMetric: TemperatureMetric,
  setSelectedMetric: (m: TemperatureMetric) => void
): Command[] {
  return [
    {
      id: 'tempmetric-max',
      name: 'Max Temperature',
      icon: selectedMetric === 'max' ? '✓' : '',
      action: () => setSelectedMetric('max'),
    },
    {
      id: 'tempmetric-min',
      name: 'Min Temperature',
      icon: selectedMetric === 'min' ? '✓' : '',
      action: () => setSelectedMetric('min'),
    },
    {
      id: 'tempmetric-avg',
      name: 'Average Temperature',
      icon: selectedMetric === 'avg' ? '✓' : '',
      action: () => setSelectedMetric('avg'),
    },
    {
      id: 'tempmetric-median',
      name: 'Median Temperature',
      icon: selectedMetric === 'median' ? '✓' : '',
      action: () => setSelectedMetric('median'),
    },
  ];
}

/**
 * Generate all control-related commands for the command palette.
 * This is the main entry point for command generation.
 */
export function generateControlCommands(params: ControlCommandParams): Command[] {
  return [
    {
      id: 'select-resorts',
      name: 'Select Resorts',
      icon: '⛷️',
      action: params.openResortSelector,
    },
    {
      id: 'elevation',
      name: 'Elevation',
      icon: '⛰️',
      subCommands: generateElevationCommands(
        params.selectedElevation,
        params.setSelectedElevation
      ),
    },
    {
      id: 'sort-by',
      name: 'Sort By',
      icon: '📊',
      subCommands: generateSortCommands(
        params.selectedSort,
        params.setSelectedSort
      ),
    },
    {
      id: 'sort-day',
      name: 'Sort Day',
      icon: '📅',
      subCommands: generateSortDayCommands(
        params.selectedSortDay,
        params.setSelectedSortDay,
        params.sortDayData
      ),
    },
    {
      id: 'sort-order',
      name: 'Sort Order',
      icon: '↕️',
      subCommands: generateOrderCommands(
        params.isReversed,
        params.setIsReversed
      ),
    },
    {
      id: 'view-mode',
      name: 'Choose view...',
      icon: '👁️',
      subCommands: generateViewModeCommands(
        params.viewMode,
        params.setViewMode
      ),
    },
    {
      id: 'utility-bar',
      name: 'Utility Bar',
      icon: '🎛️',
      subCommands: generateUtilityBarCommands(
        params.showUtilityBar,
        params.setShowUtilityBar
      ),
    },
  ];
}

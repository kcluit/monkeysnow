/**
 * Command generators for dynamic command palette integration.
 * Generates commands with checkmarks based on current state.
 */

import type { Command, ElevationLevel, SortOption, SortDay, SortDayData, ViewMode, TemperatureMetric, SnowfallEstimateMode, UtilityBarStyle } from '../types';

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
  // Snowfall Estimate Mode
  snowfallEstimateMode: SnowfallEstimateMode;
  setSnowfallEstimateMode: (m: SnowfallEstimateMode) => void;
  // Utility Bar visibility
  showUtilityBar: boolean;
  setShowUtilityBar: (show: boolean) => void;
  // Utility Bar style
  utilityBarStyle: UtilityBarStyle;
  setUtilityBarStyle: (style: UtilityBarStyle) => void;
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
      name: 'Base forecast',
      icon: selectedElevation === 'bot' ? '✓' : '',
      action: () => setSelectedElevation('bot'),
    },
    {
      id: 'elevation-mid',
      name: 'Mid forecast',
      icon: selectedElevation === 'mid' ? '✓' : '',
      action: () => setSelectedElevation('mid'),
    },
    {
      id: 'elevation-top',
      name: 'Peak forecast',
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
      name: 'Normal order',
      icon: !isReversed ? '✓' : '',
      action: () => setIsReversed(false),
    },
    {
      id: 'order-reverse',
      name: 'Reverse order',
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
 * Generate utility bar style submenu commands with checkmarks.
 */
export function generateUtilityBarStyleCommands(
  utilityBarStyle: UtilityBarStyle,
  setUtilityBarStyle: (style: UtilityBarStyle) => void
): Command[] {
  return [
    {
      id: 'utilitybar-style-compact',
      name: 'Compact',
      icon: utilityBarStyle === 'compact' ? '✓' : '',
      action: () => setUtilityBarStyle('compact'),
    },
    {
      id: 'utilitybar-style-large',
      name: 'Large',
      icon: utilityBarStyle === 'large' ? '✓' : '',
      action: () => setUtilityBarStyle('large'),
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
      name: 'Max temperature',
      icon: selectedMetric === 'max' ? '✓' : '',
      action: () => setSelectedMetric('max'),
    },
    {
      id: 'tempmetric-min',
      name: 'Min temperature',
      icon: selectedMetric === 'min' ? '✓' : '',
      action: () => setSelectedMetric('min'),
    },
    {
      id: 'tempmetric-avg',
      name: 'Average temperature',
      icon: selectedMetric === 'avg' ? '✓' : '',
      action: () => setSelectedMetric('avg'),
    },
    {
      id: 'tempmetric-median',
      name: 'Median temperature',
      icon: selectedMetric === 'median' ? '✓' : '',
      action: () => setSelectedMetric('median'),
    },
  ];
}

/**
 * Generate snowfall estimate mode submenu commands with checkmarks.
 */
export function generateSnowfallEstimateCommands(
  selectedMode: SnowfallEstimateMode,
  setSelectedMode: (m: SnowfallEstimateMode) => void
): Command[] {
  return [
    {
      id: 'snowfall-model',
      name: 'Use Model Estimate',
      icon: selectedMode === 'model' ? '✓' : '',
      action: () => setSelectedMode('model'),
    },
    {
      id: 'snowfall-totalprecip',
      name: 'Estimate Using Total Precip',
      icon: selectedMode === 'totalPrecip' ? '✓' : '',
      action: () => setSelectedMode('totalPrecip'),
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
      name: 'Select resorts',
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
      name: 'Sort by',
      icon: '📊',
      subCommands: generateSortCommands(
        params.selectedSort,
        params.setSelectedSort
      ),
    },
    {
      id: 'sort-day',
      name: 'Sort day',
      icon: '📅',
      subCommands: generateSortDayCommands(
        params.selectedSortDay,
        params.setSelectedSortDay,
        params.sortDayData
      ),
    },
    {
      id: 'sort-order',
      name: 'Sort order',
      icon: '↕️',
      subCommands: generateOrderCommands(
        params.isReversed,
        params.setIsReversed
      ),
    },
    {
      id: 'view-mode',
      name: 'Choose view',
      icon: '👁️',
      subCommands: generateViewModeCommands(
        params.viewMode,
        params.setViewMode
      ),
    },
    {
      id: 'temperature-metric',
      name: 'Temperature Display...',
      icon: '🌡️',
      subCommands: generateTemperatureMetricCommands(
        params.selectedTemperatureMetric,
        params.setSelectedTemperatureMetric
      ),
    },
    {
      id: 'snowfall-estimate',
      name: 'Snowfall Estimate...',
      icon: '❄️',
      subCommands: generateSnowfallEstimateCommands(
        params.snowfallEstimateMode,
        params.setSnowfallEstimateMode
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
    {
      id: 'utility-bar-style',
      name: 'Utility Bar Style',
      icon: '📐',
      subCommands: generateUtilityBarStyleCommands(
        params.utilityBarStyle,
        params.setUtilityBarStyle
      ),
    },
  ];
}

/**
 * Command generators for dynamic command palette integration.
 * Generates commands with checkmarks based on current state.
 */

import type { Command, ElevationLevel, SortOption, SortDay, SortDayData, ViewMode, TemperatureMetric, SnowfallEstimateMode, WeatherModelSetting, UtilityBarStyle, UnitSystem, ResortDisplayLimit } from '../types';
import type { Language } from '../types/i18n';
import { icons } from '../constants/icons';

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
  // Weather Model
  weatherModel: WeatherModelSetting;
  setWeatherModel: (m: WeatherModelSetting) => void;
  // Utility Bar visibility
  showUtilityBar: boolean;
  setShowUtilityBar: (show: boolean) => void;
  // Utility Bar style
  utilityBarStyle: UtilityBarStyle;
  setUtilityBarStyle: (style: UtilityBarStyle) => void;
  // Unit System
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
  // Resort display limit
  resortDisplayLimit: ResortDisplayLimit;
  setResortDisplayLimit: (limit: ResortDisplayLimit) => void;
  // Resort selector
  openResortSelector: () => void;
  // Language
  languageId: string;
  setLanguage: (id: string) => void;
  availableLanguages: Language[];
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
      icon: selectedElevation === 'bot' ? icons.check : undefined,
      action: () => setSelectedElevation('bot'),
    },
    {
      id: 'elevation-mid',
      name: 'Mid forecast',
      icon: selectedElevation === 'mid' ? icons.check : undefined,
      action: () => setSelectedElevation('mid'),
    },
    {
      id: 'elevation-top',
      name: 'Peak forecast',
      icon: selectedElevation === 'top' ? icons.check : undefined,
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
      icon: selectedSort === 'temperature' ? icons.check : undefined,
      action: () => setSelectedSort('temperature'),
    },
    {
      id: 'sort-snowfall',
      name: 'Sort by Snowfall',
      icon: selectedSort === 'snowfall' ? icons.check : undefined,
      action: () => setSelectedSort('snowfall'),
    },
    {
      id: 'sort-wind',
      name: 'Sort by Wind',
      icon: selectedSort === 'wind' ? icons.check : undefined,
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
      icon: selectedSortDay === option.value ? icons.check : undefined,
      action: () => setSelectedSortDay(option.value as SortDay),
    });
  }

  // Regular day options (Today, Tomorrow, etc.)
  sortDayData.regularDays.forEach((day, index) => {
    commands.push({
      id: `sortday-${index}`,
      name: day.name,
      icon: selectedSortDay === index ? icons.check : undefined,
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
      icon: !isReversed ? icons.check : undefined,
      action: () => setIsReversed(false),
    },
    {
      id: 'order-reverse',
      name: 'Reverse order',
      icon: isReversed ? icons.check : undefined,
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
      icon: viewMode === 'default' ? icons.check : undefined,
      action: () => setViewMode('default'),
    },
    {
      id: 'viewmode-full',
      name: 'Full',
      icon: viewMode === 'full' ? icons.check : undefined,
      action: () => setViewMode('full'),
    },
    {
      id: 'viewmode-compact',
      name: 'Compact',
      icon: viewMode === 'compact' ? icons.check : undefined,
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
      icon: showUtilityBar ? icons.check : undefined,
      action: () => setShowUtilityBar(true),
    },
    {
      id: 'utilitybar-hide',
      name: 'Hide',
      icon: !showUtilityBar ? icons.check : undefined,
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
      icon: utilityBarStyle === 'compact' ? icons.check : undefined,
      action: () => setUtilityBarStyle('compact'),
    },
    {
      id: 'utilitybar-style-large',
      name: 'Large',
      icon: utilityBarStyle === 'large' ? icons.check : undefined,
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
      icon: selectedMetric === 'max' ? icons.check : undefined,
      action: () => setSelectedMetric('max'),
    },
    {
      id: 'tempmetric-min',
      name: 'Min temperature',
      icon: selectedMetric === 'min' ? icons.check : undefined,
      action: () => setSelectedMetric('min'),
    },
    {
      id: 'tempmetric-avg',
      name: 'Average temperature',
      icon: selectedMetric === 'avg' ? icons.check : undefined,
      action: () => setSelectedMetric('avg'),
    },
    {
      id: 'tempmetric-median',
      name: 'Median temperature',
      icon: selectedMetric === 'median' ? icons.check : undefined,
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
      icon: selectedMode === 'model' ? icons.check : undefined,
      action: () => setSelectedMode('model'),
    },
    {
      id: 'snowfall-totalprecip',
      name: 'monkeysnow estimate',
      icon: selectedMode === 'totalPrecip' ? icons.check : undefined,
      action: () => setSelectedMode('totalPrecip'),
    },
  ];
}

/**
 * Generate weather model submenu commands with checkmarks.
 */
export function generateWeatherModelCommands(
  weatherModel: WeatherModelSetting,
  setWeatherModel: (m: WeatherModelSetting) => void
): Command[] {
  return [
    {
      id: 'weathermodel-auto',
      name: 'Auto',
      icon: weatherModel === 'auto' ? icons.check : undefined,
      action: () => setWeatherModel('auto'),
    },
  ];
}

/**
 * Generate unit system submenu commands with checkmarks.
 */
export function generateUnitSystemCommands(
  unitSystem: UnitSystem,
  setUnitSystem: (system: UnitSystem) => void
): Command[] {
  return [
    {
      id: 'units-metric',
      name: 'Metric (°C, cm, km/h)',
      icon: unitSystem === 'metric' ? icons.check : undefined,
      action: () => { setUnitSystem('metric'); window.location.reload(); },
    },
    {
      id: 'units-imperial',
      name: 'Imperial (°F, in, mph)',
      icon: unitSystem === 'imperial' ? icons.check : undefined,
      action: () => { setUnitSystem('imperial'); window.location.reload(); },
    },
  ];
}

/**
 * Generate resort display limit submenu commands with checkmarks.
 */
export function generateResortDisplayLimitCommands(
  currentLimit: ResortDisplayLimit,
  setLimit: (limit: ResortDisplayLimit) => void
): Command[] {
  const presets: { value: ResortDisplayLimit; name: string }[] = [
    { value: 'auto', name: 'Auto (100 on mobile)' },
    { value: 50, name: '50' },
    { value: 100, name: '100' },
    { value: 200, name: '200' },
    { value: 500, name: '500' },
    { value: 0, name: 'No limit' },
  ];

  return presets.map(({ value, name }) => ({
    id: `resort-limit-${value}`,
    name,
    icon: currentLimit === value ? icons.check : undefined,
    action: () => setLimit(value),
  }));
}

/**
 * Generate language submenu commands with checkmarks.
 * Shows both English name and native name for each language.
 */
export function generateLanguageCommands(
  currentLanguageId: string,
  setLanguage: (id: string) => void,
  availableLanguages: Language[]
): Command[] {
  return availableLanguages.map((lang) => ({
    id: `language-${lang.id}`,
    name: lang.name === lang.nativeName
      ? lang.name
      : `${lang.name} (${lang.nativeName})`,
    icon: currentLanguageId === lang.id ? icons.check : undefined,
    action: () => setLanguage(lang.id),
  }));
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
      icon: icons.resort,
      action: params.openResortSelector,
    },
    {
      id: 'elevation',
      name: 'Elevation',
      icon: icons.mountain,
      subCommands: generateElevationCommands(
        params.selectedElevation,
        params.setSelectedElevation
      ),
    },
    {
      id: 'sort-by',
      name: 'Sort by',
      icon: icons.chart,
      subCommands: generateSortCommands(
        params.selectedSort,
        params.setSelectedSort
      ),
    },
    {
      id: 'sort-day',
      name: 'Sort day',
      icon: icons.calendar,
      subCommands: generateSortDayCommands(
        params.selectedSortDay,
        params.setSelectedSortDay,
        params.sortDayData
      ),
    },
    {
      id: 'sort-order',
      name: 'Sort order',
      icon: icons.sort,
      subCommands: generateOrderCommands(
        params.isReversed,
        params.setIsReversed
      ),
    },
    {
      id: 'view-mode',
      name: 'Choose view',
      icon: icons.view,
      subCommands: generateViewModeCommands(
        params.viewMode,
        params.setViewMode
      ),
    },
    {
      id: 'temperature-metric',
      name: 'Temperature display',
      icon: icons.temperature,
      subCommands: generateTemperatureMetricCommands(
        params.selectedTemperatureMetric,
        params.setSelectedTemperatureMetric
      ),
    },
    {
      id: 'snowfall-estimate',
      name: 'Snowfall estimate',
      icon: icons.snow,
      subCommands: generateSnowfallEstimateCommands(
        params.snowfallEstimateMode,
        params.setSnowfallEstimateMode
      ),
    },
    {
      id: 'weather-model',
      name: 'Weather model',
      icon: icons.weatherModel,
      subCommands: generateWeatherModelCommands(
        params.weatherModel,
        params.setWeatherModel
      ),
    },
    {
      id: 'utility-bar',
      name: 'Utility bar',
      icon: icons.controls,
      subCommands: generateUtilityBarCommands(
        params.showUtilityBar,
        params.setShowUtilityBar
      ),
    },
    {
      id: 'utility-bar-style',
      name: 'Utility bar style',
      icon: icons.ruler,
      subCommands: generateUtilityBarStyleCommands(
        params.utilityBarStyle,
        params.setUtilityBarStyle
      ),
    },
    {
      id: 'units',
      name: 'Units',
      icon: icons.units,
      subCommands: generateUnitSystemCommands(
        params.unitSystem,
        params.setUnitSystem
      ),
    },
    {
      id: 'resort-display-limit',
      name: 'Resort display limit',
      icon: icons.resortLimit,
      subCommands: generateResortDisplayLimitCommands(
        params.resortDisplayLimit,
        params.setResortDisplayLimit
      ),
    },
    {
      id: 'language',
      name: 'Language',
      icon: icons.language,
      subCommands: generateLanguageCommands(
        params.languageId,
        params.setLanguage,
        params.availableLanguages
      ),
    },
  ];
}

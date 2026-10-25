/**
 * Command generators for dynamic command palette integration.
 * Generates commands with checkmarks based on current state, named in the language
 * showing as they are generated (App generates them again when it changes).
 */

import type { Command, ElevationLevel, SortOption, SortDay, SortDayData, ViewMode, TemperatureMetric, SnowfallEstimateMode, SnowCaution, UtilityBarStyle, UnitSystem, ResortDisplayLimit } from '../types';
import type { Language } from '../types/i18n';
import { translate, translatePlural } from '../locales';
import type { ElevationSelection } from '../types/detailView';
import { icons } from '../constants/icons';
import { formatElevation } from './unitConversion';
import { FORECAST_HORIZONS, HISTORY_LENGTHS } from './constants';
import {
  BASE_MAPS,
  OVERLAYS,
  TERRAIN_COLOURINGS,
  terrainColouring,
  withOverlay,
  withTerrainColouring,
  type MapLayers,
} from './mapLayers';

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
  // History
  isHistory: boolean;
  setIsHistory: (on: boolean) => void;
  historyLength: number;
  setHistoryLength: (days: number) => void;
  // Temperature Metric
  selectedTemperatureMetric: TemperatureMetric;
  setSelectedTemperatureMetric: (m: TemperatureMetric) => void;
  // Snowfall Estimate Mode
  snowfallEstimateMode: SnowfallEstimateMode;
  setSnowfallEstimateMode: (m: SnowfallEstimateMode) => void;
  // Snow caution
  snowCaution: SnowCaution;
  setSnowCaution: (c: SnowCaution) => void;
  // Weather Model
  openCardModels: () => void;
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
  // Model styles
  openModelStyles: () => void;
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
      name: translate('command.elevation.base'),
      icon: selectedElevation === 'bot' ? icons.check : undefined,
      action: () => setSelectedElevation('bot'),
    },
    {
      id: 'elevation-mid',
      name: translate('command.elevation.mid'),
      icon: selectedElevation === 'mid' ? icons.check : undefined,
      action: () => setSelectedElevation('mid'),
    },
    {
      id: 'elevation-top',
      name: translate('command.elevation.top'),
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
      name: translate('command.sortBy.temperature'),
      icon: selectedSort === 'temperature' ? icons.check : undefined,
      action: () => setSelectedSort('temperature'),
    },
    {
      id: 'sort-snowfall',
      name: translate('command.sortBy.snowfall'),
      icon: selectedSort === 'snowfall' ? icons.check : undefined,
      action: () => setSelectedSort('snowfall'),
    },
    {
      id: 'sort-wind',
      name: translate('command.sortBy.wind'),
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

  // One option per day, today first
  sortDayData.regularDays.forEach((label, index) => {
    commands.push({
      id: `sortday-${index}`,
      name: label,
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
      name: translate('command.sortOrder.normal'),
      icon: !isReversed ? icons.check : undefined,
      action: () => setIsReversed(false),
    },
    {
      id: 'order-reverse',
      name: translate('command.sortOrder.reverse'),
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
      name: translate('command.view.default'),
      icon: viewMode === 'default' ? icons.check : undefined,
      action: () => setViewMode('default'),
    },
    {
      id: 'viewmode-full',
      name: translate('command.view.full'),
      icon: viewMode === 'full' ? icons.check : undefined,
      action: () => setViewMode('full'),
    },
    {
      id: 'viewmode-compact',
      name: translate('command.view.compact'),
      icon: viewMode === 'compact' ? icons.check : undefined,
      action: () => setViewMode('compact'),
    },
    {
      id: 'viewmode-graph',
      name: translate('command.view.graph'),
      icon: viewMode === 'graph' ? icons.check : undefined,
      action: () => setViewMode('graph'),
    },
  ];
}

/**
 * Generate History's switch and History length submenus with checkmarks.
 */
export function generateHistoryCommands(
  isHistory: boolean,
  setIsHistory: (on: boolean) => void,
  historyLength: number,
  setHistoryLength: (days: number) => void
): Command[] {
  return [
    {
      id: 'history',
      name: translate('command.history'),
      icon: icons.history,
      subCommands: [
        {
          id: 'history-on',
          name: translate('common.on'),
          icon: isHistory ? icons.check : undefined,
          action: () => setIsHistory(true),
        },
        {
          id: 'history-off',
          name: translate('common.off'),
          icon: !isHistory ? icons.check : undefined,
          action: () => setIsHistory(false),
        },
      ],
    },
    {
      id: 'history-length',
      name: translate('command.historyLength'),
      icon: icons.calendar,
      subCommands: HISTORY_LENGTHS.map((days) => ({
        id: `history-length-${days}`,
        name: translatePlural('command.days', days),
        icon: historyLength === days ? icons.check : undefined,
        action: () => setHistoryLength(days),
      })),
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
      name: translate('common.show'),
      icon: showUtilityBar ? icons.check : undefined,
      action: () => setShowUtilityBar(true),
    },
    {
      id: 'utilitybar-hide',
      name: translate('common.hide'),
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
      name: translate('command.utilityBarStyle.compact'),
      icon: utilityBarStyle === 'compact' ? icons.check : undefined,
      action: () => setUtilityBarStyle('compact'),
    },
    {
      id: 'utilitybar-style-large',
      name: translate('command.utilityBarStyle.large'),
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
      name: translate('command.temperature.max'),
      icon: selectedMetric === 'max' ? icons.check : undefined,
      action: () => setSelectedMetric('max'),
    },
    {
      id: 'tempmetric-min',
      name: translate('command.temperature.min'),
      icon: selectedMetric === 'min' ? icons.check : undefined,
      action: () => setSelectedMetric('min'),
    },
    {
      id: 'tempmetric-avg',
      name: translate('command.temperature.avg'),
      icon: selectedMetric === 'avg' ? icons.check : undefined,
      action: () => setSelectedMetric('avg'),
    },
    {
      id: 'tempmetric-median',
      name: translate('command.temperature.median'),
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
      name: translate('command.snowfall.useModel'),
      icon: selectedMode === 'model' ? icons.check : undefined,
      action: () => setSelectedMode('model'),
    },
    {
      id: 'snowfall-totalprecip',
      name: translate('snowfall.monkeysnow'),
      icon: selectedMode === 'totalPrecip' ? icons.check : undefined,
      action: () => setSelectedMode('totalPrecip'),
    },
  ];
}

/**
 * Generate Snow caution submenu commands with checkmarks.
 */
export function generateSnowCautionCommands(
  selectedCaution: SnowCaution,
  setSelectedCaution: (c: SnowCaution) => void
): Command[] {
  return [
    {
      id: 'snow-caution-extra-cautious',
      name: translate('snowCaution.extraCautious'),
      icon: selectedCaution === 'extraCautious' ? icons.check : undefined,
      action: () => setSelectedCaution('extraCautious'),
    },
    {
      id: 'snow-caution-cautious',
      name: translate('snowCaution.cautious'),
      icon: selectedCaution === 'cautious' ? icons.check : undefined,
      action: () => setSelectedCaution('cautious'),
    },
    {
      id: 'snow-caution-realistic',
      name: translate('snowCaution.realistic'),
      icon: selectedCaution === 'realistic' ? icons.check : undefined,
      action: () => setSelectedCaution('realistic'),
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
      name: translate('command.units.metric'),
      icon: unitSystem === 'metric' ? icons.check : undefined,
      action: () => { setUnitSystem('metric'); window.location.reload(); },
    },
    {
      id: 'units-imperial',
      name: translate('command.units.imperial'),
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
    { value: 'auto', name: translate('command.resortDisplayLimit.auto') },
    { value: 50, name: '50' },
    { value: 100, name: '100' },
    { value: 200, name: '200' },
    { value: 500, name: '500' },
    { value: 0, name: translate('command.resortDisplayLimit.none') },
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
 * Each language is named in itself, so a visitor finds theirs whatever the page is in.
 */
export function generateLanguageCommands(
  currentLanguageId: string,
  setLanguage: (id: string) => void,
  availableLanguages: Language[]
): Command[] {
  return availableLanguages.map((lang) => ({
    id: `language-${lang.id}`,
    name: lang.nativeName,
    keywords: [lang.name],
    icon: currentLanguageId === lang.id ? icons.check : undefined,
    action: () => setLanguage(lang.id),
  }));
}

/**
 * On and Off for one setting, the current one ticked.
 */
function generateOnOffCommands(id: string, isOn: boolean, setOn: (on: boolean) => void): Command[] {
  return [
    { id: `${id}-on`, name: translate('common.on'), icon: isOn ? icons.check : undefined, action: () => setOn(true) },
    { id: `${id}-off`, name: translate('common.off'), icon: !isOn ? icons.check : undefined, action: () => setOn(false) },
  ];
}

export interface DetailedViewCommandParams {
  openDetailedViewModels: () => void;
  openChartsPicker: () => void;
  elevationSelection: ElevationSelection;
  setElevationSelection: (e: ElevationSelection) => void;
  unitSystem: UnitSystem;
  forecastHorizon: number;
  setForecastHorizon: (days: number) => void;
  isChartLocked: boolean;
  setIsChartLocked: (locked: boolean) => void;
  mapLayers: MapLayers;
  setMapLayers: (layers: MapLayers) => void;
}

/**
 * Generate the Detailed view's commands: what is forecast, the Charts, and the map's Base map and Overlays.
 * They show on every page, like the Settings page's Detailed view group, and change an open Detailed view at once.
 */
export function generateDetailedViewCommands(params: DetailedViewCommandParams): Command[] {
  const { elevationSelection, setElevationSelection, mapLayers, setMapLayers } = params;
  const elevationBands: { value: ElevationSelection; name: string }[] = [
    { value: 'base', name: translate('band.base') },
    { value: 'mid', name: translate('band.mid') },
    { value: 'top', name: translate('band.top') },
  ];
  const elevationCommands: Command[] = elevationBands.map(({ value, name }) => ({
    id: `detail-elevation-${value}`,
    name,
    icon: elevationSelection === value ? icons.check : undefined,
    action: () => setElevationSelection(value),
  }));
  // A Custom elevation is typed on the Settings page or in the Detailed view; here it is only shown
  if (typeof elevationSelection === 'number') {
    elevationCommands.push({
      id: 'detail-elevation-custom',
      name: translate('command.customElevation', { elevation: formatElevation(elevationSelection, params.unitSystem) }),
      icon: icons.check,
      action: () => setElevationSelection(elevationSelection),
    });
  }

  const colouring = terrainColouring(mapLayers);

  return [
    {
      id: 'detail-models',
      name: translate('command.detailedViewModels'),
      icon: icons.weatherModel,
      action: params.openDetailedViewModels,
    },
    {
      id: 'detail-elevation',
      name: translate('command.detailedViewElevation'),
      icon: icons.mountain,
      subCommands: elevationCommands,
    },
    {
      id: 'forecast-horizon',
      name: translate('command.forecastHorizon'),
      icon: icons.calendar,
      subCommands: FORECAST_HORIZONS.map((days) => ({
        id: `forecast-horizon-${days}`,
        name: translatePlural('command.days', days),
        icon: params.forecastHorizon === days ? icons.check : undefined,
        action: () => params.setForecastHorizon(days),
      })),
    },
    {
      id: 'select-charts',
      name: translate('command.selectCharts'),
      icon: icons.lineChart,
      action: params.openChartsPicker,
    },
    {
      id: 'lock-charts',
      name: translate('command.lockCharts'),
      icon: icons.lock,
      subCommands: generateOnOffCommands('lock-charts', params.isChartLocked, params.setIsChartLocked),
    },
    {
      id: 'base-map',
      name: translate('command.baseMap'),
      icon: icons.baseMap,
      subCommands: BASE_MAPS.map((base) => ({
        id: `base-map-${base.id}`,
        name: base.label,
        icon: mapLayers.baseMap === base.id ? icons.check : undefined,
        action: () => setMapLayers({ ...mapLayers, baseMap: base.id }),
      })),
    },
    ...OVERLAYS.map((overlay) => ({
      id: `overlay-${overlay.id}`,
      name: overlay.label,
      icon: icons.overlay,
      subCommands: generateOnOffCommands(
        `overlay-${overlay.id}`,
        mapLayers.overlays.includes(overlay.id),
        (on) => setMapLayers(withOverlay(mapLayers, overlay.id, on))
      ),
    })),
    {
      id: 'terrain-colouring',
      name: translate('command.colourTerrainBy'),
      icon: icons.overlay,
      subCommands: [{ id: null, label: translate('command.colourTerrainBy.none') }, ...TERRAIN_COLOURINGS].map((option) => ({
        id: `terrain-colouring-${option.id ?? 'none'}`,
        name: option.label,
        icon: colouring === option.id ? icons.check : undefined,
        action: () => setMapLayers(withTerrainColouring(mapLayers, option.id)),
      })),
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
      name: translate('command.selectResorts'),
      icon: icons.resort,
      action: params.openResortSelector,
    },
    {
      id: 'elevation',
      name: translate('command.mainPageElevation'),
      icon: icons.mountain,
      subCommands: generateElevationCommands(
        params.selectedElevation,
        params.setSelectedElevation
      ),
    },
    {
      id: 'sort-by',
      name: translate('command.sortBy'),
      icon: icons.chart,
      subCommands: generateSortCommands(
        params.selectedSort,
        params.setSelectedSort
      ),
    },
    {
      id: 'sort-day',
      name: translate('command.sortDay'),
      icon: icons.calendar,
      subCommands: generateSortDayCommands(
        params.selectedSortDay,
        params.setSelectedSortDay,
        params.sortDayData
      ),
    },
    {
      id: 'sort-order',
      name: translate('command.sortOrder'),
      icon: icons.sort,
      subCommands: generateOrderCommands(
        params.isReversed,
        params.setIsReversed
      ),
    },
    {
      id: 'view-mode',
      name: translate('command.chooseView'),
      icon: icons.view,
      subCommands: generateViewModeCommands(
        params.viewMode,
        params.setViewMode
      ),
    },
    ...generateHistoryCommands(
      params.isHistory,
      params.setIsHistory,
      params.historyLength,
      params.setHistoryLength
    ),
    {
      id: 'temperature-metric',
      name: translate('command.temperatureDisplay'),
      icon: icons.temperature,
      subCommands: generateTemperatureMetricCommands(
        params.selectedTemperatureMetric,
        params.setSelectedTemperatureMetric
      ),
    },
    {
      id: 'snowfall-estimate',
      name: translate('term.snowfallEstimate'),
      icon: icons.snow,
      subCommands: generateSnowfallEstimateCommands(
        params.snowfallEstimateMode,
        params.setSnowfallEstimateMode
      ),
    },
    {
      id: 'snow-caution',
      name: translate('term.snowCaution'),
      icon: icons.caution,
      subCommands: generateSnowCautionCommands(
        params.snowCaution,
        params.setSnowCaution
      ),
    },
    {
      id: 'card-models',
      name: translate('command.mainPageModels'),
      icon: icons.weatherModel,
      action: params.openCardModels,
    },
    {
      id: 'utility-bar',
      name: translate('command.utilityBar'),
      icon: icons.controls,
      subCommands: generateUtilityBarCommands(
        params.showUtilityBar,
        params.setShowUtilityBar
      ),
    },
    {
      id: 'utility-bar-style',
      name: translate('command.utilityBarStyle'),
      icon: icons.ruler,
      subCommands: generateUtilityBarStyleCommands(
        params.utilityBarStyle,
        params.setUtilityBarStyle
      ),
    },
    {
      id: 'units',
      name: translate('command.units'),
      icon: icons.units,
      subCommands: generateUnitSystemCommands(
        params.unitSystem,
        params.setUnitSystem
      ),
    },
    {
      id: 'resort-display-limit',
      name: translate('command.resortDisplayLimit'),
      icon: icons.resortLimit,
      subCommands: generateResortDisplayLimitCommands(
        params.resortDisplayLimit,
        params.setResortDisplayLimit
      ),
    },
    {
      id: 'language',
      name: translate('language.title'),
      // Found by its name in every language, for a visitor who can't read the one showing
      keywords: params.availableLanguages.map((lang) => lang.translations['language.title']),
      icon: icons.language,
      subCommands: generateLanguageCommands(
        params.languageId,
        params.setLanguage,
        params.availableLanguages
      ),
    },
    {
      id: 'model-styles',
      name: translate('command.modelStyles'),
      icon: icons.chart,
      action: params.openModelStyles,
    },
  ];
}

import type { Translations } from '../types/i18n';

/**
 * English translations - the source of truth for all UI strings.
 *
 * When adding new translatable strings:
 * 1. Add the key to Translations interface in types/i18n.ts
 * 2. Add the English translation here
 * 3. TypeScript will require all other language files to add the key
 */
export const en: Translations = {
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.on': 'On',
    'common.off': 'Off',
    'common.show': 'Show',
    'common.hide': 'Hide',

    // Utility Bar
    'utilityBar.selectResorts': 'Select Resorts',
    'utilityBar.baseForecast': 'Base Forecast',
    'utilityBar.midForecast': 'Mid Forecast',
    'utilityBar.peakForecast': 'Peak Forecast',
    'utilityBar.sortByTemperature': 'Sort by Temperature',
    'utilityBar.sortBySnowfall': 'Sort by Snowfall',
    'utilityBar.sortByWind': 'Sort by Wind',
    'utilityBar.reverseOrder': 'Reverse Order',
    'utilityBar.normalOrder': 'Normal Order',
    'utilityBar.default': 'Default',
    'utilityBar.fullView': 'Full View',
    'utilityBar.compact': 'Compact',

    // Cards
    'card.webcams': 'Webcams',
    'card.freezing': 'Freezing',
    'card.snow': 'snow',
    'card.wind': 'wind',
    'card.totals': 'Totals',
    'card.next3Days': 'Next 3 Days',
    'card.next7Days': 'Next 7 Days',

    // Commands
    'command.theme': 'Theme',
    'command.font': 'Font',
    'command.rainbowText': 'Rainbow text',
    'command.fullscreen': 'Fullscreen',
    'command.fpsCounter': 'FPS counter',
    'command.hideIcons': 'Hide icons',
    'command.showBorders': 'Show borders',
    'command.showDate': 'Show date',
    'command.elevation': 'Elevation',
    'command.sortBy': 'Sort by',
    'command.sortDay': 'Sort day',
    'command.sortOrder': 'Sort order',
    'command.chooseView': 'Choose view',
    'command.temperatureDisplay': 'Temperature display',
    'command.snowfallEstimate': 'Snowfall estimate',
    'command.utilityBar': 'Utility bar',
    'command.utilityBarStyle': 'Utility bar style',
    'command.units': 'Units',
    'command.language': 'Language',
    'command.resorts': 'Resorts',

    // Elevation options
    'elevation.base': 'Base forecast',
    'elevation.mid': 'Mid forecast',
    'elevation.peak': 'Peak forecast',

    // Sort options
    'sort.temperature': 'Temperature',
    'sort.snowfall': 'Snowfall',
    'sort.wind': 'Wind',

    // Sort Day
    'sortDay.next3Days': 'Next 3 Days',
    'sortDay.next7Days': 'Next 7 Days',
    'sortDay.today': 'Today',

    // Sort Order
    'sortOrder.normal': 'Normal',
    'sortOrder.reverse': 'Reverse',

    // View modes
    'view.default': 'Default',
    'view.full': 'Full View',
    'view.compact': 'Compact',

    // Temperature metrics
    'temperature.max': 'Maximum',
    'temperature.min': 'Minimum',
    'temperature.avg': 'Average',
    'temperature.median': 'Median',

    // Snowfall estimate
    'snowfall.model': 'Model estimate',
    'snowfall.totalPrecip': 'monkeysnow estimate',

    // Utility bar style
    'utilityBarStyle.compact': 'Compact',
    'utilityBarStyle.large': 'Large',

    // Units
    'units.metric': 'Metric (°C, cm, km/h)',
    'units.imperial': 'Imperial (°F, in, mph)',

    // Loading and Error states
    'loading.weatherData': 'Loading weather data...',
    'error.loadingWeatherData': 'Error loading weather data',
    'error.tryRefreshing': 'Please try refreshing the page',

    // Empty states
    'empty.selectResorts': 'Select resorts to view forecasts',

    // Detail View
    'detail.loadingForecast': 'Loading forecast data...',
    'detail.errorLoadingForecast': 'Error loading forecast data',
    'detail.back': 'Back',
};

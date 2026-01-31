import { z } from 'zod';

/**
 * All translatable UI strings in the application.
 * Keys use namespaced prefixes for organization.
 *
 * When adding new strings, add them here first - TypeScript will
 * then require them in all language files.
 */
export interface Translations {
    // Common
    'common.loading': string;
    'common.error': string;
    'common.on': string;
    'common.off': string;
    'common.show': string;
    'common.hide': string;

    // Utility Bar
    'utilityBar.selectResorts': string;
    'utilityBar.baseForecast': string;
    'utilityBar.midForecast': string;
    'utilityBar.peakForecast': string;
    'utilityBar.sortByTemperature': string;
    'utilityBar.sortBySnowfall': string;
    'utilityBar.sortByWind': string;
    'utilityBar.reverseOrder': string;
    'utilityBar.normalOrder': string;
    'utilityBar.default': string;
    'utilityBar.fullView': string;
    'utilityBar.compact': string;

    // Cards
    'card.webcams': string;
    'card.freezing': string;
    'card.snow': string;
    'card.wind': string;
    'card.totals': string;
    'card.next3Days': string;
    'card.next7Days': string;

    // Commands
    'command.theme': string;
    'command.font': string;
    'command.rainbowText': string;
    'command.fullscreen': string;
    'command.fpsCounter': string;
    'command.hideIcons': string;
    'command.showBorders': string;
    'command.showDate': string;
    'command.elevation': string;
    'command.sortBy': string;
    'command.sortDay': string;
    'command.sortOrder': string;
    'command.chooseView': string;
    'command.temperatureDisplay': string;
    'command.snowfallEstimate': string;
    'command.utilityBar': string;
    'command.utilityBarStyle': string;
    'command.units': string;
    'command.language': string;
    'command.resorts': string;

    // Elevation options
    'elevation.base': string;
    'elevation.mid': string;
    'elevation.peak': string;

    // Sort options
    'sort.temperature': string;
    'sort.snowfall': string;
    'sort.wind': string;

    // Sort Day
    'sortDay.next3Days': string;
    'sortDay.next7Days': string;
    'sortDay.today': string;

    // Sort Order
    'sortOrder.normal': string;
    'sortOrder.reverse': string;

    // View modes
    'view.default': string;
    'view.full': string;
    'view.compact': string;

    // Temperature metrics
    'temperature.max': string;
    'temperature.min': string;
    'temperature.avg': string;
    'temperature.median': string;

    // Snowfall estimate
    'snowfall.model': string;
    'snowfall.totalPrecip': string;

    // Utility bar style
    'utilityBarStyle.compact': string;
    'utilityBarStyle.large': string;

    // Units
    'units.metric': string;
    'units.imperial': string;

    // Loading and Error states
    'loading.weatherData': string;
    'error.loadingWeatherData': string;
    'error.tryRefreshing': string;

    // Empty states
    'empty.selectResorts': string;

    // Detail View
    'detail.loadingForecast': string;
    'detail.errorLoadingForecast': string;
    'detail.back': string;
}

/**
 * Type-safe translation key.
 * Using this type ensures only valid keys can be passed to t().
 */
export type TranslationKey = keyof Translations;

/**
 * Language definition with metadata and translations.
 */
export interface Language {
    /** Unique identifier (e.g., 'en', 'fr', 'zh') */
    id: string;
    /** English name (e.g., 'French') */
    name: string;
    /** Native name (e.g., 'Français') */
    nativeName: string;
    /** All translated strings */
    translations: Translations;
}

/**
 * Zod schema for validating translations.
 * Ensures all required keys are present.
 */
export const TranslationsSchema = z.object({
    // Common
    'common.loading': z.string(),
    'common.error': z.string(),
    'common.on': z.string(),
    'common.off': z.string(),
    'common.show': z.string(),
    'common.hide': z.string(),

    // Utility Bar
    'utilityBar.selectResorts': z.string(),
    'utilityBar.baseForecast': z.string(),
    'utilityBar.midForecast': z.string(),
    'utilityBar.peakForecast': z.string(),
    'utilityBar.sortByTemperature': z.string(),
    'utilityBar.sortBySnowfall': z.string(),
    'utilityBar.sortByWind': z.string(),
    'utilityBar.reverseOrder': z.string(),
    'utilityBar.normalOrder': z.string(),
    'utilityBar.default': z.string(),
    'utilityBar.fullView': z.string(),
    'utilityBar.compact': z.string(),

    // Cards
    'card.webcams': z.string(),
    'card.freezing': z.string(),
    'card.snow': z.string(),
    'card.wind': z.string(),
    'card.totals': z.string(),
    'card.next3Days': z.string(),
    'card.next7Days': z.string(),

    // Commands
    'command.theme': z.string(),
    'command.font': z.string(),
    'command.rainbowText': z.string(),
    'command.fullscreen': z.string(),
    'command.fpsCounter': z.string(),
    'command.hideIcons': z.string(),
    'command.showBorders': z.string(),
    'command.showDate': z.string(),
    'command.elevation': z.string(),
    'command.sortBy': z.string(),
    'command.sortDay': z.string(),
    'command.sortOrder': z.string(),
    'command.chooseView': z.string(),
    'command.temperatureDisplay': z.string(),
    'command.snowfallEstimate': z.string(),
    'command.utilityBar': z.string(),
    'command.utilityBarStyle': z.string(),
    'command.units': z.string(),
    'command.language': z.string(),
    'command.resorts': z.string(),

    // Elevation options
    'elevation.base': z.string(),
    'elevation.mid': z.string(),
    'elevation.peak': z.string(),

    // Sort options
    'sort.temperature': z.string(),
    'sort.snowfall': z.string(),
    'sort.wind': z.string(),

    // Sort Day
    'sortDay.next3Days': z.string(),
    'sortDay.next7Days': z.string(),
    'sortDay.today': z.string(),

    // Sort Order
    'sortOrder.normal': z.string(),
    'sortOrder.reverse': z.string(),

    // View modes
    'view.default': z.string(),
    'view.full': z.string(),
    'view.compact': z.string(),

    // Temperature metrics
    'temperature.max': z.string(),
    'temperature.min': z.string(),
    'temperature.avg': z.string(),
    'temperature.median': z.string(),

    // Snowfall estimate
    'snowfall.model': z.string(),
    'snowfall.totalPrecip': z.string(),

    // Utility bar style
    'utilityBarStyle.compact': z.string(),
    'utilityBarStyle.large': z.string(),

    // Units
    'units.metric': z.string(),
    'units.imperial': z.string(),

    // Loading and Error states
    'loading.weatherData': z.string(),
    'error.loadingWeatherData': z.string(),
    'error.tryRefreshing': z.string(),

    // Empty states
    'empty.selectResorts': z.string(),

    // Detail View
    'detail.loadingForecast': z.string(),
    'detail.errorLoadingForecast': z.string(),
    'detail.back': z.string(),
}) satisfies z.ZodType<Translations>;

/**
 * Zod schema for validating a complete language definition.
 */
export const LanguageSchema = z.object({
    id: z.string(),
    name: z.string(),
    nativeName: z.string(),
    translations: TranslationsSchema,
});

/**
 * Return type for the useLanguage hook.
 */
export interface UseLanguageReturn {
    /** Current language */
    language: Language;
    /** Set language by ID */
    setLanguage: (languageId: string) => void;
    /** Translation function - returns translated string for key */
    t: (key: TranslationKey) => string;
    /** All available languages */
    availableLanguages: Language[];
}

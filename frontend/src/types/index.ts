import type { Theme } from './themes';
import type { UnitSystem as UnitSystemType } from '../utils/unitConversion';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { WeatherModel } from './openMeteo';

// Unit system
export type UnitSystem = UnitSystemType;

// Command Palette types
export interface Command {
    id: string;
    name: string;
    shortcut?: string;
    icon?: IconDefinition;
    action?: () => void;
    subCommands?: Command[];
}

export interface CommandPaletteState {
    isOpen: boolean;
    searchQuery: string;
    selectedIndex: number;
    commandStack: Command[][];
    currentCommands: Command[];
}

export interface UseCommandPaletteReturn {
    isOpen: boolean;
    searchQuery: string;
    selectedIndex: number;
    filteredCommands: Command[];
    openPalette: () => void;
    openToCommand: (commandId: string) => void;
    closePalette: () => void;
    setSearchQuery: (query: string) => void;
    setSelectedIndex: (index: number) => void;
    navigateUp: () => void;
    navigateDown: () => void;
    selectCurrent: () => void;
    selectAtIndex: (index: number) => void;
    goBack: () => void;
    canGoBack: boolean;
}

// Extended theme return type
export interface UseThemeReturn {
    theme: Theme;
    setTheme: (themeId: string) => void;
    isDark: boolean;
    availableThemes: Theme[];
    applyTheme: (theme: Theme) => void;
    resetPreview: () => void;
}

// Elevation & sorting types
export type ElevationLevel = 'bot' | 'mid' | 'top';
export type SortOption = 'temperature' | 'snowfall' | 'wind';
/**
 * The day or days the cards are sorted by, counted from today: a day's index (0 is today),
 * or the 3 or 7 days nearest today, which in History are the latest ones. 'allDays' is
 * every day History shows, offered only in History.
 */
export type SortDay = number | 'next3days' | 'next7days' | 'allDays';
export type ViewMode = 'default' | 'full' | 'compact' | 'graph';
export type UtilityBarStyle = 'compact' | 'large';
export type TemperatureMetric = 'max' | 'min' | 'avg' | 'median';
export type SnowfallEstimateMode = 'model' | 'totalPrecip';
export type ResortDisplayLimit = 'auto' | number;
export type SnowQuality = 'rain' | 'sleet/mix' | 'wet_snow' | 'powder' | 'dry_snow';

// Weather data structures from new API format
export interface PeriodData {
    temperature_max: number;
    temperature_min: number;
    temperature_avg: number;
    temperature_median: number;
    wind_speed: number;
    wind_direction: number;
    relative_humidity: number;
    precipitation_total: number;
    rain_total: number;
    snowfall_total: number;
    weather_code: number;
    surface_pressure: number;
    freezing_level: number | null;
    /** The monkeysnow estimate's snow, cm (utils/snowQuality.ts) */
    snowfall_estimate: number;
    /** The monkeysnow estimate's rain, mm; these two are missing on forecasts cached under an earlier SNOW_ESTIMATE_VERSION, which are refetched */
    rain_estimate?: number;
    /** mm of precipitation that fell under each Snow quality, in SNOW_QUALITIES order, which the day's label is summed from */
    precipitation_by_quality?: number[];
    /** The one under which most of the Period's precipitation fell, the worst of the tied on a tie; null when nothing fell */
    snow_quality: SnowQuality | null;
}

export interface DayData {
    AM: PeriodData | null;
    PM: PeriodData | null;
    NIGHT: PeriodData | null;
}

export interface ElevationMetadata {
    elevation: number;
    lat: number;
    lon: number;
}

/** One value an hour, from `start` (epoch seconds) every `interval` seconds; NaN where the model has none */
export interface HourlySeries {
    start: number;
    interval: number;
    values: Float32Array;
}

/** One Elevation band's forecast hour by hour, as its Graph draws it; it ends where the Card model's Range does */
export interface HourlyForecast {
    /** Epoch seconds of the first hour */
    start: number;
    /** Seconds from one hour to the next */
    interval: number;
    /** °C at each hour */
    temperature: Float32Array;
    /** The Card model's own snowfall in the hour before each one, cm */
    snowfall: Float32Array;
    /** The monkeysnow estimate's snow in the hour before each one, cm, from its precipitation and this band's wet bulb (utils/snowQuality.ts) */
    snowEstimate: Float32Array;
    /** Everything that fell in the hour before each one, mm of water, including the showers Open-Meteo's rain leaves out */
    precipitation: Float32Array;
    /** Each hour's Snow quality, as its index in SNOW_QUALITIES, or -1 when nothing falls */
    quality: Int8Array;
    /** km/h at 10 m above the ground; these three are missing on forecasts cached before they were kept */
    windSpeed?: Float32Array;
    /** Degrees the wind blows from, 0 = north */
    windDirection?: Float32Array;
    /** The Card model's WMO weather code */
    weatherCode?: Uint8Array;
}

export interface ElevationForecast {
    metadata: ElevationMetadata;
    forecast: Record<string, DayData>; // date string -> day data
    /** Missing on forecasts cached before hours were kept */
    hours?: HourlyForecast;
}

export interface ResortData {
    bot: ElevationForecast;
    mid: ElevationForecast;
    top: ElevationForecast;
    fetchedAt?: number; // epoch ms; missing on forecasts cached from the old backend
    /** The Card model it was fetched from; missing on forecasts cached before it was recorded */
    model?: WeatherModel;
    /** The Freezing level hour by hour, one for every Elevation band; missing on forecasts cached before hours were kept */
    freezingLevel?: HourlySeries;
    /** The IANA time zone of the point, e.g. "America/Vancouver" */
    timeZone?: string;
    /** The SNOW_ESTIMATE_VERSION it was estimated under; missing or older counts as stale, so it is refetched */
    estimateVersion?: number;
    /** Set on History: how many days it was fetched for, today so far the last of them, up to the hour it was fetched */
    historyDays?: number;
}

export interface AllWeatherData {
    updatedAt: string;
    data: Record<string, ResortData>; // resort name -> resort data
    /** Set when these are History, cut to the History length: how many days each shows */
    historyLength?: number;
}

// Snow condition type
export interface SnowCondition {
    text: string;
    isHighlight: boolean;
    isSecondary?: boolean;  // true for N/A display
}

// Period data (AM/PM/Night)
export interface Period {
    time: string;
    temp: string;
    tempMax: number;
    tempMin: number;
    tempAvg: number;
    tempMedian: number;
    snow: string;
    rain: string;
    wind: string;
    /** The same amounts in metric and unrounded, for adding up and comparing */
    snowCm: number;
    rainMm: number;
    windKmh: number;
    condition: string;
    snowQuality: SnowQuality | null;
    /** The highest Freezing level in this Period, e.g. "1720 m" */
    freezingLevel: string;
}

// Day forecast data
export interface DayForecast {
    name: string;
    date: string;
    weather: string;
    weatherEmoji: string;
    periods: Period[];
    freezingLevel: string;
    snowCondition: SnowCondition;
}

// Processed resort data for display
export interface ProcessedResortData {
    id: string;
    name: string;
    elevation: string;
    days: DayForecast[];
    fetchedAt?: number; // epoch ms, from ResortData
    /** Label of the Card model it came from, e.g. "NOAA HRRR" */
    model: string;
    /** Whether these are History's days, oldest first and today last, rather than the forecast's, today first */
    isHistory?: boolean;
}

// Snow totals over the 3 and 7 days nearest today: the next ones, or in History the latest
export interface SnowTotals {
    threeDays: number;
    sevenDays: number;
}

// Day stats for DefaultCard
export interface DayStats {
    /** °C, rounded like the periods' temperatures, for colouring */
    maxTemp: number;
    /** The temperature as shown, in the user's units */
    temp: string;
    /** Metric: cm, mm and km/h */
    snow: number;
    rain: number;
    wind: number;
}

// Sort day option
export interface SortDayOption {
    name: string;
    value: string;
}

export interface SortDayData {
    specialOptions: SortDayOption[];
    /** The label of each day the Selection can be sorted by, today first (in History, going back) */
    regularDays: string[];
}

// Component props
export interface UtilityBarProps {
    selectedResorts: string[];
    setSelectedResorts: (resorts: string[] | ((prev: string[]) => string[])) => void;
    selectedElevation: ElevationLevel;
    setSelectedElevation: (elevation: ElevationLevel) => void;
    selectedSort: SortOption;
    setSelectedSort: (sort: SortOption) => void;
    selectedSortDay: SortDay;
    setSelectedSortDay: (day: SortDay) => void;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    isHistory: boolean;
    setIsHistory: (on: boolean) => void;
    isReversed: boolean;
    setIsReversed: (value: boolean) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    filteredResorts: string[];
    sortDayData: SortDayData;
    cancelLoading: () => void;
}

export interface CardProps {
    resort: ProcessedResortData;
    temperatureMetric?: TemperatureMetric;
    snowfallEstimateMode?: SnowfallEstimateMode;
    showDate?: boolean;
    unitSystem?: UnitSystem;
    onResortClick?: (resortId: string) => void;
    selectedElevation?: ElevationLevel;
}

export interface ThemeToggleProps {
    // Currently no props needed
}

// Hook return types
// UseThemeReturn is defined at the top of the file

export interface UseWeatherDataReturn {
    allWeatherData: AllWeatherData | null;
    loading: boolean;
    error: Error | null;
    updatedAt: string | null;
    /** Selected resorts with no forecast yet, waiting on the Fetch budget */
    queuedCount: number;
    /** Open-Meteo calls still needed to load the queued resorts */
    queuedCalls: number;
    createLoadingController: () => AbortController;
    cancelLoading: () => void;
}

export interface UseResortFilteringReturn {
    searchTerm: string;
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    filteredResorts: string[];
    sortResorts: (
        resorts: string[],
        sortBy: SortOption,
        selectedElevation: ElevationLevel,
        selectedSortDay: SortDay,
        isReversed: boolean,
        temperatureMetric?: TemperatureMetric,
        snowfallEstimateMode?: SnowfallEstimateMode,
        unitSystem?: UnitSystem
    ) => string[];
}

// Re-export detail view types
export type {
    WeatherModel,
    WeatherVariable,
    OpenMeteoResponse,
    ModelWeatherData,
    HourlyDataPoint,
    TimezoneInfo,
} from './openMeteo';

export type {
    DetailViewState,
    DetailViewConfig,
    VariableConfig,
    ModelConfig,
    DetailedResortViewProps,
    DetailViewHeaderProps,
    DetailUtilityBarProps,
    DetailChartGridProps,
    WeatherChartProps,
} from './detailView';

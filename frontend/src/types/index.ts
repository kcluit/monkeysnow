import type { Theme } from './themes';
import type { UnitSystem as UnitSystemType } from '../utils/unitConversion';

// Unit system
export type UnitSystem = UnitSystemType;

// Command Palette types
export interface Command {
  id: string;
  name: string;
  shortcut?: string;
  icon?: string;
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
}

// Elevation & sorting types
export type ElevationLevel = 'bot' | 'mid' | 'top';
export type SortOption = 'temperature' | 'snowfall' | 'wind';
export type SortDay = number | 'next3days' | 'next7days';
export type ViewMode = 'default' | 'full' | 'compact';
export type UtilityBarStyle = 'compact' | 'large';
export type TemperatureMetric = 'max' | 'min' | 'avg' | 'median';
export type SnowfallEstimateMode = 'model' | 'totalPrecip';
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
  // Snow estimation fields
  snowfall_estimate: number;
  snow_to_liquid_ratio: number;
  snow_quality: SnowQuality;
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

export interface ElevationForecast {
  metadata: ElevationMetadata;
  forecast: Record<string, DayData>; // date string -> day data
}

export interface ResortData {
  bot: ElevationForecast;
  mid: ElevationForecast;
  top: ElevationForecast;
}

export interface AllWeatherData {
  updatedAt: string;
  data: Record<string, ResortData>; // resort name -> resort data
}

// Snow condition type
export interface SnowCondition {
  text: string;
  isRainbow: boolean;
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
  condition: string;
  snowQuality: SnowQuality | null;
  snowToLiquidRatio: number;
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
  name: string;
  elevation: string;
  days: DayForecast[];
}

// Snow totals
export interface SnowTotals {
  next3Days: number;
  next7Days: number;
}

// Day stats for DefaultCard
export interface DayStats {
  maxTemp: number;
  snow: number;
  wind: number;
}

// Sort day option
export interface SortDayOption {
  name: string;
  value: string;
}

export interface SortDayData {
  specialOptions: SortDayOption[];
  regularDays: DayForecast[];
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
  isReversed: boolean;
  setIsReversed: (value: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredResorts: string[];
  allWeatherData: AllWeatherData | null;
  processResortData: (
    allData: AllWeatherData,
    resortName: string,
    elevation: ElevationLevel
  ) => ProcessedResortData | null;
  cancelLoading: () => void;
}

export interface CardProps {
  resort: ProcessedResortData;
  temperatureMetric?: TemperatureMetric;
  snowfallEstimateMode?: SnowfallEstimateMode;
  showDate?: boolean;
  unitSystem?: UnitSystem;
  onResortClick?: (resortId: string) => void;
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

// Elevation & sorting types
export type ElevationLevel = 'bot' | 'mid' | 'top';
export type ElevationDataKey = 'botData' | 'midData' | 'topData';
export type SortOption = 'temperature' | 'snowfall' | 'wind';
export type SortDay = number | 'next3days' | 'next7days';

// Weather data structures from API
export interface WeatherData {
  success: boolean;
  bottomElevation: number;
  temperatureBlocks: number[][];
  snowBlocks: number[][];
  rainBlocks: number[][];
  windBlocks: number[][];
  phrasesBlocks: string[][];
  freezinglevelBlocks: number[][];
}

export interface ResortApiData {
  resort: string;
  data: WeatherData;
}

export interface ElevationData {
  resorts: ResortApiData[];
}

export interface AllWeatherData {
  botData: ElevationData;
  midData: ElevationData;
  topData: ElevationData;
}

// Snow condition type
export interface SnowCondition {
  text: string;
  isRainbow: boolean;
}

// Period data (AM/PM/Night)
export interface Period {
  time: string;
  temp: string;
  snow: string;
  rain: string;
  wind: string;
  condition: string;
}

// Day forecast data
export interface DayForecast {
  name: string;
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
export interface ControlPanelProps {
  selectedResorts: string[];
  setSelectedResorts: (resorts: string[] | ((prev: string[]) => string[])) => void;
  selectedElevation: ElevationLevel;
  setSelectedElevation: (elevation: ElevationLevel) => void;
  selectedSort: SortOption;
  setSelectedSort: (sort: SortOption) => void;
  selectedSortDay: SortDay;
  setSelectedSortDay: (day: SortDay) => void;
  moreInfo: boolean;
  setMoreInfo: (value: boolean) => void;
  isReversed: boolean;
  setIsReversed: (value: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredResorts: string[];
  allWeatherData: AllWeatherData | null;
  processResortData: (
    allData: AllWeatherData,
    resortName: string,
    elevation: ElevationDataKey
  ) => ProcessedResortData | null;
  cancelLoading: () => void;
}

export interface CardProps {
  resort: ProcessedResortData;
}

export interface ThemeToggleProps {
  // Currently no props needed
}

// Hook return types
export interface UseThemeReturn {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isDark: boolean;
}

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
    isReversed: boolean
  ) => string[];
}

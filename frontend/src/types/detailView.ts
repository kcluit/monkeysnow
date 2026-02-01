import type { WeatherModel, WeatherVariable, TimezoneInfo, AggregationType } from './openMeteo';
import type { UnitSystem } from '../utils/unitConversion';

// Elevation selection can be a preset type or a custom number
export type ElevationSelection = 'base' | 'mid' | 'top' | number;

// Custom location when user clicks on map (temporary, not persisted)
export interface CustomLocation {
    lat: number;
    lon: number;
    elevation: number | null;  // null while loading
}

// Detail view navigation state
export interface DetailViewState {
    isDetailView: boolean;
    selectedResortId: string | null;
}

// Configuration for a weather variable (how to display it in charts)
export interface VariableConfig {
    id: WeatherVariable;
    label: string;
    unit: string;
    unitImperial: string;
    color: string;
    chartType: 'line' | 'bar' | 'area';
    formatValue: (value: number, unitSystem: UnitSystem) => string;
    convertToImperial?: (value: number) => number;
    yAxisDomain?: [number | 'auto', number | 'auto'];
    description?: string;
    defaultHeight?: number;
}

// Configuration for a weather model (how to display it in charts)
export interface ModelConfig {
    id: WeatherModel;
    name: string;
    color: string;
    description?: string;
}

// Detail view configuration state (what the user has selected)
export interface DetailViewConfig {
    selectedModels: WeatherModel[];
    selectedVariables: WeatherVariable[];
    elevation: number;
    forecastDays: number;
}

// Props for detail view components
export interface DetailedResortViewProps {
    resortId: string;
    resortName: string;
    location: {
        lat: number;
        lon: number;
        baseElevation: number;
        midElevation: number;
        topElevation: number;
    };
}

export interface DetailViewHeaderProps {
    resortName: string;
    elevation: number;
}

export interface DetailUtilityBarProps {
    onBack: () => void;
    selectedModels: WeatherModel[];
    setSelectedModels: (models: WeatherModel[] | ((prev: WeatherModel[]) => WeatherModel[])) => void;
    selectedVariables: WeatherVariable[];
    setSelectedVariables: (variables: WeatherVariable[]) => void;
    selectedAggregations: AggregationType[];
    setSelectedAggregations: (aggregations: AggregationType[] | ((prev: AggregationType[]) => AggregationType[])) => void;
    aggregationColors: Record<AggregationType, string>;
    setAggregationColors: (colors: Record<AggregationType, string>) => void;
    hideAggregationMembers: boolean;
    setHideAggregationMembers: (hide: boolean) => void;
    showMinMaxFill: boolean;
    setShowMinMaxFill: (show: boolean) => void;
    showPercentileFill: boolean;
    setShowPercentileFill: (show: boolean) => void;
    elevationSelection: ElevationSelection;
    setElevationSelection: (selection: ElevationSelection) => void;
    resolvedElevation: number;
    forecastDays: number;
    setForecastDays: (days: number) => void;
    location: {
        baseElevation: number;
        midElevation: number;
        topElevation: number;
    };
    isChartLocked: boolean;
    setIsChartLocked: (locked: boolean) => void;
    // Custom location state (temporary, not persisted)
    customLocation: import('./detailView').CustomLocation | null;
    onResetCustomLocation: () => void;
    isLoadingElevation: boolean;
}

export interface DetailChartGridProps {
    data: Map<WeatherModel, import('./openMeteo').HourlyDataPoint[]>;
    selectedModels: WeatherModel[];
    selectedVariables: WeatherVariable[];
    selectedAggregations: AggregationType[];
    aggregationColors: Record<AggregationType, string>;
    hideAggregationMembers?: boolean;
    showMinMaxFill?: boolean;
    showPercentileFill?: boolean;
    unitSystem: UnitSystem;
    timezoneInfo?: TimezoneInfo;
    isChartLocked?: boolean;
    onToggleVariable?: (variable: WeatherVariable) => void;
    /** Location elevations for freezing level chart reference lines */
    location?: {
        baseElevation: number;
        midElevation: number;
        topElevation: number;
    };
}

export interface WeatherChartProps {
    data: Map<WeatherModel, import('./openMeteo').HourlyDataPoint[]>;
    selectedModels: WeatherModel[];
    selectedAggregations: AggregationType[];
    aggregationColors: Record<AggregationType, string>;
    hideAggregationMembers?: boolean;
    showMinMaxFill?: boolean;
    showPercentileFill?: boolean;
    variable: WeatherVariable;
    unitSystem: UnitSystem;
    timezoneInfo?: TimezoneInfo;
    isChartLocked?: boolean;
    onToggleVisibility?: () => void;
    /** Location elevations for freezing level chart reference lines */
    location?: {
        baseElevation: number;
        midElevation: number;
        topElevation: number;
    };
}

import type { WeatherModel, WeatherVariable, AggregationType, HourlyDataPoint } from './openMeteo';
import type { UnitSystem } from '../utils/unitConversion';
import type { UtilityBarStyle, ModelLineOpacity } from './index';
import type { DroppedModel } from '../utils/comparisonModels';
import type { TimeAxis } from '../utils/timeAxis';

/** Where the detail view is forecasting, and which fetched models were dropped there */
export interface ModelAvailabilityContext {
    point: { lat: number; lon: number };
    droppedModels: ReadonlyMap<WeatherModel, DroppedModel>;
    /** How many Comparison models are drawn at this point */
    shownModelCount: number;
}

// Elevation selection can be a preset type or a custom number
export type ElevationSelection = 'base' | 'mid' | 'top' | number;

// Custom location when user clicks on map (temporary unless saved as a Saved location).
// Its elevation is the ground elevation Open-Meteo reports with the forecast.
export interface CustomLocation {
    lat: number;
    lon: number;
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
    /** Set when this is a Saved location's view: it has one elevation, and can be edited or deleted */
    savedLocation?: import('../utils/savedLocations').SavedLocation;
}

export interface DetailViewHeaderProps {
    resortName: string;
    elevation: number;
}

export interface DetailUtilityBarProps {
    onBack: () => void;
    unitSystem: UnitSystem;
    /** Comparison models drawn here, Preferred models and Aggregations, for the Models button */
    shownModelCount: number;
    preferredModelCount: number;
    aggregationCount: number;
    onOpenModels: () => void;
    selectedVariables: WeatherVariable[];
    setSelectedVariables: (variables: WeatherVariable[]) => void;
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
    /** A Saved location's one elevation, shown in place of the Base/Mid/Top choice */
    fixedElevation?: number;
    // Custom location state (temporary unless saved)
    customLocation: CustomLocation | null;
    /** The Custom location's Ground elevation, once a forecast has reported it */
    groundElevation: number | null;
    /** The Custom location's Custom elevation, or null while it is forecast at its Ground elevation */
    customElevation: number | null;
    setCustomElevation: (elevation: number | null) => void;
    onResetCustomLocation: () => void;
    utilityBarStyle: UtilityBarStyle;
}

export interface DetailChartGridProps {
    data: ReadonlyMap<WeatherModel, HourlyDataPoint[]>;
    /** Time axis shared by every chart, or null until a model has arrived */
    timeAxis: TimeAxis | null;
    selectedModels: WeatherModel[];
    selectedVariables: WeatherVariable[];
    selectedAggregations: AggregationType[];
    aggregationColors: Record<AggregationType, string>;
    hideAggregationMembers?: boolean;
    showMinMaxFill?: boolean;
    showPercentileFill?: boolean;
    modelLineOpacity?: ModelLineOpacity;
    unitSystem: UnitSystem;
    isChartLocked?: boolean;
    isLoading?: boolean;
    onToggleVariable?: (variable: WeatherVariable) => void;
    /** Location elevations for freezing level chart reference lines */
    location?: {
        baseElevation: number;
        midElevation: number;
        topElevation: number;
    };
}

export interface WeatherChartProps {
    data: ReadonlyMap<WeatherModel, HourlyDataPoint[]>;
    /** Time axis shared by every chart, or null until a model has arrived */
    timeAxis: TimeAxis | null;
    selectedModels: WeatherModel[];
    selectedAggregations: AggregationType[];
    aggregationColors: Record<AggregationType, string>;
    hideAggregationMembers?: boolean;
    showMinMaxFill?: boolean;
    showPercentileFill?: boolean;
    modelLineOpacity?: ModelLineOpacity;
    variable: WeatherVariable;
    unitSystem: UnitSystem;
    isChartLocked?: boolean;
    /** Whether more models may still arrive (so an empty chart isn't final yet) */
    isLoading?: boolean;
    onToggleVisibility?: () => void;
    /** Location elevations for freezing level chart reference lines */
    location?: {
        baseElevation: number;
        midElevation: number;
        topElevation: number;
    };
}

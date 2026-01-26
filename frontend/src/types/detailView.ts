import type { WeatherModel, WeatherVariable, TimezoneInfo } from './openMeteo';
import type { UnitSystem } from '../utils/unitConversion';

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
    onBack: () => void;
}

export interface DetailViewHeaderProps {
    resortName: string;
    elevation: number;
    onBack: () => void;
}

export interface DetailUtilityBarProps {
    selectedModels: WeatherModel[];
    setSelectedModels: (models: WeatherModel[]) => void;
    selectedVariables: WeatherVariable[];
    setSelectedVariables: (variables: WeatherVariable[]) => void;
    elevation: number;
    setElevation: (elevation: number) => void;
    forecastDays: number;
    setForecastDays: (days: number) => void;
    location: {
        baseElevation: number;
        midElevation: number;
        topElevation: number;
    };
    onBack: () => void;
}

export interface DetailChartGridProps {
    data: Map<WeatherModel, import('./openMeteo').HourlyDataPoint[]>;
    selectedModels: WeatherModel[];
    selectedVariables: WeatherVariable[];
    unitSystem: UnitSystem;
    timezoneInfo?: TimezoneInfo;
}

export interface WeatherChartProps {
    data: Map<WeatherModel, import('./openMeteo').HourlyDataPoint[]>;
    selectedModels: WeatherModel[];
    variable: WeatherVariable;
    unitSystem: UnitSystem;
    timezoneInfo?: TimezoneInfo;
}

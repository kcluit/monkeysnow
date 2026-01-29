/**
 * Chart Types
 *
 * Library-agnostic type definitions for chart configuration.
 * These types are used by chartBuilder.ts and rendered by the uPlot adapter.
 */

export type ChartType = 'line' | 'bar' | 'area' | 'band' | 'boxwhisker' | 'heatmap';
export type LineStyle = 'solid' | 'dashed' | 'dotted';

/** Data for box & whisker charts (ensemble spread visualization) */
export interface BoxWhiskerData {
    min: (number | null)[];
    q1: (number | null)[];
    median: (number | null)[];
    q3: (number | null)[];
    max: (number | null)[];
}

/** Data for heatmap charts (hour-of-day matrix visualization) */
export interface HeatmapData {
    hours: number[];       // 0-23
    dates: string[];       // Date labels
    values: (number | null)[][]; // [hour][date]
}

/** Data for wind direction arrows overlay */
export interface WindArrowData {
    direction: (number | null)[]; // degrees (0-360)
}

/** Theme colors extracted from CSS variables */
export interface ChartTheme {
    background: string;
    textPrimary: string;
    textSecondary: string;
    gridColor: string;
    accent: string;
    tooltipBg: string;
    tooltipBorder: string;
}

/** Configuration for a single data series */
export interface SeriesConfig {
    id: string;
    name: string;
    color: string;
    type: ChartType;
    data: (number | null)[];
    lineWidth?: number;
    opacity?: number;
    fillOpacity?: number;
    lineStyle?: LineStyle;
    zIndex?: number;
    yAxisIndex?: number; // 0 = primary (left), 1 = secondary (right)
    bandData?: {
        upper: (number | null)[];
        lower: (number | null)[];
    };
    /** Box & whisker data for ensemble spread visualization */
    boxWhiskerData?: BoxWhiskerData;
    /** Heatmap data for hour-of-day matrix visualization */
    heatmapData?: HeatmapData;
    /** Wind direction data for arrow overlay */
    windArrowData?: WindArrowData;
}

/** X-axis configuration */
export interface XAxisConfig {
    type: 'category' | 'time';
    data: string[];
    /** Indices that represent midnight (12 AM) - used to ensure these ticks are always shown */
    midnightIndices?: number[];
    /** Full date+time labels for tooltip display (e.g., "Tue Feb 3, 4 AM") */
    tooltipLabels?: string[];
}

/** Y-axis configuration */
export interface YAxisConfig {
    type: 'value';
    label: string;
    domain?: [number | 'auto', number | 'auto'];
    formatter: (value: number) => string;
}

/** Grid padding configuration */
export interface GridConfig {
    top: number;
    right: number;
    bottom: number;
    left: number;
    containLabel: boolean;
}

/** Data zoom configuration */
export interface DataZoomConfig {
    enabled: boolean;
    type: 'slider' | 'inside' | 'both';
    range: [number, number];
}

/** Elevation lines configuration for freezing level charts */
export interface ElevationLinesConfig {
    base: number;
    mid: number;
    top: number;
    unit: string;
}

/** Complete chart configuration */
export interface ChartConfig {
    type: ChartType;
    /** The weather variable this chart displays (e.g., 'temperature_2m') */
    variable?: string;
    xAxis: XAxisConfig;
    yAxis: YAxisConfig;
    yAxisSecondary?: YAxisConfig;
    series: SeriesConfig[];
    grid: GridConfig;
    dataZoom?: DataZoomConfig;
    theme: ChartTheme;
    /** Chart height in pixels */
    height: number;
    animation: boolean;
    /** Optional elevation lines for freezing level charts */
    elevationLines?: ElevationLinesConfig;
}

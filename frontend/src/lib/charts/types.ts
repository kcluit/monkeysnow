/**
 * Chart Types
 *
 * Library-agnostic type definitions for chart configuration.
 * These types are used by chartBuilder.ts and rendered by the uPlot adapter.
 */

export type ChartType = 'line' | 'bar' | 'area' | 'band';
export type LineStyle = 'solid' | 'dashed' | 'dotted';

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
}

/** Horizontal reference line */
export interface MarkLineData {
    yValue: number;
    label: string;
    color: string;
    lineWidth: number;
    lineStyle: 'solid' | 'dashed';
}

/** X-axis configuration */
export interface XAxisConfig {
    type: 'category' | 'time';
    data: string[];
}

/** Y-axis configuration */
export interface YAxisConfig {
    type: 'value';
    label: string;
    domain?: [number | 'auto', number | 'auto'];
    formatter: (value: number) => string;
}

/** Tooltip configuration */
export interface TooltipConfig {
    enabled: boolean;
    trigger: 'axis' | 'item';
    interactionMode: 'stop' | 'follow';
    appendToBody: boolean;
    showAllSeries: boolean;
}

/** Legend configuration */
export interface LegendConfig {
    enabled: boolean;
    position: 'top' | 'bottom';
    interactive: boolean;
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

/** Series definition WITHOUT data - for structural comparison */
export interface SeriesDefinition {
    id: string;
    name: string;
    color: string;
    type: ChartType;
    lineWidth?: number;
    opacity?: number;
    fillOpacity?: number;
    lineStyle?: LineStyle;
    zIndex?: number;
    yAxisIndex?: number;
    hasBandData?: boolean;
}

/** Structural config - changes require chart rebuild */
export interface ChartStructure {
    type: ChartType;
    xAxisType: 'category' | 'time';
    yAxis: YAxisConfig;
    yAxisSecondary?: YAxisConfig;
    seriesDefinitions: SeriesDefinition[];
    markLines?: MarkLineData[];
    tooltip: TooltipConfig;
    legend: LegendConfig;
    grid: GridConfig;
    dataZoom?: DataZoomConfig;
    theme: ChartTheme;
    height: number;
    animation: boolean;
}

/** Data only - can update via setData() without rebuild */
export interface ChartData {
    xLabels: string[];
    seriesData: Map<string, (number | null)[]>;
    bandData?: Map<string, { upper: (number | null)[]; lower: (number | null)[] }>;
}

/** Complete chart configuration (legacy format for backwards compatibility) */
export interface ChartConfig {
    type: ChartType;
    xAxis: XAxisConfig;
    yAxis: YAxisConfig;
    yAxisSecondary?: YAxisConfig;
    series: SeriesConfig[];
    markLines?: MarkLineData[];
    tooltip: TooltipConfig;
    legend: LegendConfig;
    grid: GridConfig;
    dataZoom?: DataZoomConfig;
    theme: ChartTheme;
    height: number;
    animation: boolean;
}

/** New separated config format */
export interface SeparatedChartConfig {
    structure: ChartStructure;
    data: ChartData;
}

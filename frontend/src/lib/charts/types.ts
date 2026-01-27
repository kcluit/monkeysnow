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

/** Complete chart configuration */
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

/**
 * Chart Abstraction Layer - Library-Agnostic Types
 *
 * These types define a generic chart configuration interface that can be
 * implemented by any charting library (uPlot, Recharts, D3, etc.)
 */

import type { CSSProperties } from 'react';

/** Supported chart types */
export type ChartType = 'line' | 'bar' | 'area';

/** Configuration for a single data series */
export interface SeriesConfig {
    id: string;
    name: string;
    color: string;
    type: ChartType;
    /** Data values. Use null to create gaps in the chart. */
    data: (number | null)[];
    /** Optional opacity for area fills */
    fillOpacity?: number;
    /** Optional line width (default: 2) */
    lineWidth?: number;
    /** Optional series opacity (0-1, default: 1) */
    opacity?: number;
    /** Optional z-index for rendering order */
    zIndex?: number;
    /** Optional line style for line charts */
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    /** Optional Y-axis index (0 = left/primary, 1 = right/secondary) */
    yAxisIndex?: number;
}

/** Configuration for horizontal reference lines (mark lines) */
export interface MarkLineData {
    /** Y-axis value where the line should be drawn */
    yValue: number;
    /** Label to display on the line */
    label: string;
    /** Line color */
    color: string;
    /** Line width (default: 1) */
    lineWidth: number;
    /** Line style */
    lineStyle: 'solid' | 'dashed' | 'dotted';
}

/** Axis configuration */
export interface AxisConfig {
    type: 'category' | 'value';
    data?: string[];
    label?: string;
    /** Custom formatter for tick labels */
    formatter?: (value: number) => string;
    /** Fixed domain [min, max], or 'auto' for automatic */
    domain?: [number | 'auto', number | 'auto'];
}

/** Tooltip configuration */
export interface TooltipConfig {
    enabled: boolean;
    trigger: 'axis' | 'item';
    /** Interaction mode: 'move' (default, tooltip follows mouse) or 'stop' (tooltip shows when mouse stops) */
    interactionMode?: 'move' | 'stop';
    /** Custom formatter for tooltip content */
    formatter?: (params: TooltipParams[]) => string;
    /** Whether to append tooltip to body (avoids clipping in overflowing containers) */
    appendToBody?: boolean;
}

/** Individual tooltip parameter */
export interface TooltipParams {
    seriesName: string;
    value: number;
    color: string;
    axisValue: string;
}

/** Legend configuration */
export interface LegendConfig {
    enabled: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
}

/** Grid/margin configuration */
export interface GridConfig {
    top: number;
    right: number;
    bottom: number;
    left: number;
    containLabel?: boolean;
}

/** Data zoom/brush interaction configuration */
export interface DataZoomConfig {
    enabled: boolean;
    type: 'slider' | 'inside' | 'both';
    /** Initial zoom range as percentage [start, end] */
    range?: [number, number];
}

/** Theme colors extracted from CSS variables */
export interface ChartTheme {
    background: string;
    cardBg: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    border: string;
    /** Grid line color - not affected by 'hide borders' setting */
    gridLine: string;
}

/** Complete chart configuration */
export interface ChartConfig {
    /** Unique identifier for the chart */
    id?: string;
    /** Chart type (applies default if not specified per series) */
    type: ChartType;
    /** X-axis configuration */
    xAxis: AxisConfig;
    /** Y-axis configuration (primary/left axis) */
    yAxis: AxisConfig;
    /** Secondary Y-axis configuration (right axis, optional) */
    yAxisSecondary?: AxisConfig;
    /** Data series to render */
    series: SeriesConfig[];
    /** Horizontal reference lines */
    markLines?: MarkLineData[];
    /** Tooltip settings */
    tooltip?: TooltipConfig;
    /** Legend settings */
    legend?: LegendConfig;
    /** Grid/margin settings */
    grid?: GridConfig;
    /** Zoom/brush settings */
    dataZoom?: DataZoomConfig;
    /** Theme colors */
    theme: ChartTheme;
    /** Chart height in pixels */
    height?: number;
    /** Whether animations are enabled */
    animation?: boolean;
}

/** Props for the main ChartRenderer component */
export interface ChartRendererProps {
    config: ChartConfig;
    className?: string;
    style?: CSSProperties;
}

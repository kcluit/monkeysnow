/**
 * Chart Library - Public API
 *
 * This module provides a library-agnostic charting abstraction layer.
 * Use ChartRenderer component with ChartConfig to render charts.
 */

// Main component
export { ChartRenderer } from './ChartRenderer';

// Types
export type {
    ChartConfig,
    ChartRendererProps,
    ChartType,
    SeriesConfig,
    AxisConfig,
    TooltipConfig,
    TooltipParams,
    LegendConfig,
    GridConfig,
    DataZoomConfig,
    ChartTheme,
    MarkLineData,
} from './types';

// Theme utilities
export { getUPlotTheme } from './uplot/options';

/**
 * Chart Library
 *
 * Provides uPlot-based charting with interactive features.
 */

// Types
export * from './types';

// Theme utilities
export { getUPlotTheme } from './theme';

// Zoom state utilities
export {
    extractZoomState,
    normalizeZoomState,
    denormalizeZoomState,
    isZoomed,
    applyZoomState,
    type ZoomState,
    type NormalizedZoomState,
} from './utils/zoomState';

// Main chart component
export { UPlotChart, type UPlotChartProps } from './UPlotChart';

// Chart manager (vanilla JS)
export { ChartManager, type ChartManagerOptions } from './ChartManager';

// Plugins (for advanced usage)
export {
    createZoomPlugin,
    createTooltipPlugin,
    createLegendPlugin,
    createMarkLinesPlugin,
    createBandFillPlugin,
} from './plugins';

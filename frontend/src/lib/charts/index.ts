/**
 * Chart Library
 *
 * Provides uPlot-based charting with interactive features.
 */

// Types
export * from './types';

// Theme utilities
export { getUPlotTheme } from './theme';

// Main chart component
export { UPlotChart, type UPlotChartProps } from './UPlotChart';

// Plugins (for advanced usage)
export {
    createZoomPlugin,
    createTooltipPlugin,
    createLegendPlugin,
    createMarkLinesPlugin,
    createBandFillPlugin,
} from './plugins';

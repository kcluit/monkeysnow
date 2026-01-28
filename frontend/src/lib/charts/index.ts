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

// Chart manager (vanilla JS)
export { ChartManager } from './ChartManager';

// Chart registry (for React-independent chart management)
export {
    generateChartId,
    getOrCreateChart,
    updateChart,
    destroyChart,
    getChart,
    hasChart,
    getActiveCharts,
} from './chartRegistry';

// Plugins (for advanced usage)
export { createZoomPlugin, createBandFillPlugin, createZeroAxisPlugin } from './plugins';

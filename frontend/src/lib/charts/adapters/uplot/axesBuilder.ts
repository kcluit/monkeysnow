/**
 * uPlot Axes Builder
 *
 * Builds axis configurations for uPlot charts with smart label density.
 */

import type { ChartConfig, ChartTheme } from '../../types';
import type uPlot from 'uplot';

/** Minimum pixels between X-axis labels to prevent overlap */
const MIN_LABEL_SPACING = 60;

/**
 * Build X-axis configuration for category data.
 * Uses smart label density based on zoom level and available space.
 */
function buildXAxis(config: ChartConfig, theme: ChartTheme): uPlot.Axis {
    const labels = config.xAxis.data ?? [];

    return {
        stroke: theme.textSecondary,
        grid: {
            show: true,
            stroke: theme.gridLine,
            width: 1,
            dash: [4, 4],
        },
        ticks: {
            show: true,
            stroke: theme.gridLine,
            width: 1,
            size: 5,
        },
        // Map numeric indices to category labels with zoom-aware density
        values: (u: uPlot, vals: number[]) => {
            // Calculate visible range from current zoom state
            const xScale = u.scales.x;
            const visibleMin = xScale.min ?? 0;
            const visibleMax = xScale.max ?? labels.length - 1;
            const visibleRange = visibleMax - visibleMin;

            // Calculate max labels that fit without overlap
            const availableWidth = u.bbox.width;
            const maxLabels = Math.max(2, Math.floor(availableWidth / MIN_LABEL_SPACING));

            // Calculate interval based on visible range (not total data)
            const interval = Math.max(1, Math.ceil(visibleRange / maxLabels));

            return vals.map((v) => {
                const idx = Math.floor(v);
                // Skip labels outside visible range
                if (idx < visibleMin || idx > visibleMax) return '';
                // Show labels at calculated intervals
                if (idx % interval !== 0) return '';
                return labels[idx] ?? '';
            });
        },
        font: '11px system-ui, -apple-system, sans-serif',
        gap: 5,
    };
}

/**
 * Build primary Y-axis (left side) configuration.
 */
function buildPrimaryYAxis(config: ChartConfig, theme: ChartTheme): uPlot.Axis {
    return {
        scale: 'y',
        stroke: theme.textSecondary,
        side: 3, // Left
        grid: {
            show: true,
            stroke: theme.gridLine,
            width: 1,
            dash: [4, 4],
        },
        ticks: {
            show: true,
            stroke: theme.gridLine,
            width: 1,
            size: 5,
        },
        values: (_u: uPlot, vals: number[]) => {
            return vals.map((v) => {
                if (config.yAxis.formatter) {
                    return config.yAxis.formatter(v);
                }
                return Math.round(v).toString();
            });
        },
        font: '11px system-ui, -apple-system, sans-serif',
        gap: 5,
    };
}

/**
 * Build secondary Y-axis (right side) configuration.
 */
function buildSecondaryYAxis(config: ChartConfig, theme: ChartTheme): uPlot.Axis | null {
    if (!config.yAxisSecondary) {
        return null;
    }

    return {
        scale: 'y2',
        stroke: theme.textSecondary,
        side: 1, // Right
        grid: {
            show: false, // Don't duplicate grid lines
        },
        ticks: {
            show: true,
            stroke: theme.gridLine,
            width: 1,
            size: 5,
        },
        values: (_u: uPlot, vals: number[]) => {
            return vals.map((v) => {
                if (config.yAxisSecondary?.formatter) {
                    return config.yAxisSecondary.formatter(v);
                }
                return Math.round(v).toString();
            });
        },
        font: '11px system-ui, -apple-system, sans-serif',
        gap: 5,
    };
}

/**
 * Build all axes configurations for uPlot.
 */
export function buildAxes(config: ChartConfig): uPlot.Axis[] {
    const theme = config.theme;
    const axes: uPlot.Axis[] = [
        buildXAxis(config, theme),
        buildPrimaryYAxis(config, theme),
    ];

    const secondaryAxis = buildSecondaryYAxis(config, theme);
    if (secondaryAxis) {
        axes.push(secondaryAxis);
    }

    return axes;
}

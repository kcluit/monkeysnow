/**
 * uPlot Axes Builder
 *
 * Builds axis configurations for uPlot charts.
 */

import type { ChartConfig, ChartTheme } from '../../types';
import type uPlot from 'uplot';

/**
 * Build X-axis configuration for category data.
 */
function buildXAxis(config: ChartConfig, theme: ChartTheme): uPlot.Axis {
    const labels = config.xAxis.data ?? [];
    const labelCount = labels.length;

    // Calculate interval to show ~12-14 labels
    const targetLabels = 14;
    const interval = Math.max(1, Math.ceil(labelCount / targetLabels));

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
        // Map numeric indices to category labels
        values: (_u: uPlot, vals: number[]) => {
            return vals.map((v) => {
                // Only show labels at intervals based on the actual x-value
                const idx = Math.floor(v);
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

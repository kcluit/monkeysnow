/**
 * uPlot Option Builder
 *
 * Converts library-agnostic ChartConfig to uPlot-specific options object.
 */

import type { ChartConfig } from '../../types';
import type uPlot from 'uplot';
import { buildAxes } from './axesBuilder';
import { buildScales } from './scalesBuilder';
import { buildSeriesArray } from './seriesBuilders';
import { markLinesPlugin, legendPlugin, zoomPlugin, tooltipPlugin, bandFillPlugin, labelsPlugin } from './plugins';

/** Default chart height if not specified */
const DEFAULT_HEIGHT = 280;

/**
 * Build cursor configuration for uPlot.
 * Uses uPlot's native crosshair cursor.
 */
function buildCursor(config: ChartConfig): uPlot.Cursor {
    return {
        // Show vertical and horizontal crosshair lines
        x: true,
        y: true,

        // Don't show hover points on series
        points: {
            show: false,
        },

        // Cursor line styling
        lock: false,

        // Focus mode for better performance
        focus: {
            prox: 30, // Proximity in pixels
        },

        // Sync cursor across charts (for future multi-chart sync)
        sync: {
            key: config.id ?? 'default',
            setSeries: false,
        },

        // Disable drag selection (we use zoom plugin instead)
        drag: {
            x: false,
            y: false,
            setScale: false,
        },

        // Add cursor crosshair styling via hooks
        dataIdx: (u: uPlot, _seriesIdx: number) => {
            // Return the closest data point index
            const cx = u.cursor.left ?? 0;
            const idx = u.posToIdx(cx);
            return idx;
        },
    };
}

/**
 * Build padding/grid configuration.
 */
function buildPadding(config: ChartConfig): [number, number, number, number] {
    const grid = config.grid ?? {
        top: 10,
        right: 30,
        bottom: 60,
        left: 10,
    };

    // [top, right, bottom, left]
    return [grid.top, grid.right, grid.bottom, grid.left];
}

/**
 * Convert ChartConfig to complete uPlot options object.
 */
export function buildUPlotOptions(
    config: ChartConfig,
    width: number
): uPlot.Options {
    const height = config.height ?? DEFAULT_HEIGHT;
    const theme = config.theme;

    // Build plugins array
    const plugins: uPlot.Plugin[] = [];

    // Add zoom plugin if enabled
    plugins.push(zoomPlugin(config.dataZoom));

    // Add mark lines plugin if configured
    if (config.markLines && config.markLines.length > 0) {
        plugins.push(markLinesPlugin(config.markLines, theme));
    }

    // Add legend plugin if enabled
    plugins.push(legendPlugin(config.legend, theme));

    // Build series configurations
    // First series in uPlot is always x-axis placeholder
    const seriesConfigs: uPlot.Series[] = [
        {
            // X-axis series (empty config)
        },
        ...buildSeriesArray(config),
    ];

    return {
        width,
        height,

        // Plugins
        plugins,

        // Series configurations
        series: seriesConfigs,

        // Axes configurations
        axes: buildAxes(config),

        // Scales for Y-axes
        scales: buildScales(config),

        // Cursor/tooltip configuration
        cursor: buildCursor(config),

        // Padding
        padding: buildPadding(config),

        // Performance settings
        pxAlign: 1, // Align to pixel grid for sharper rendering

        // Hooks for additional customization
        hooks: {
            // Set cursor style based on chart interaction state
            setCursor: [
                (u: uPlot) => {
                    if (u.over) {
                        // Update cursor line color from theme
                        const ctx = u.ctx;
                        ctx.strokeStyle = theme.gridLine;
                    }
                },
            ],
        },
    };
}

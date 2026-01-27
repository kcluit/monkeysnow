/**
 * uPlot Options Builder
 *
 * Converts library-agnostic ChartConfig to uPlot-specific options object.
 * Consolidated file containing theme, axes, scales, and general option building logic.
 */

import type { ChartConfig, ChartTheme } from '../types';
import type uPlot from 'uplot';
import { buildSeriesArray } from './series';
import {
    interactiveOverlayPlugin,
    smartLabelsPlugin,
    advancedZoomPlugin,
    bandFillPlugin,
    legendPlugin,
    markLinesPlugin,
} from './plugins';

// --- Theme Adapter ---

const DEFAULT_THEME: ChartTheme = {
    background: 'transparent',
    cardBg: '#ffffff',
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
    accent: '#3b82f6',
    border: '#e5e7eb',
    gridLine: 'rgba(107, 114, 128, 0.3)',
};

/**
 * Get a CSS custom property value with fallback.
 */
function getCSSVariable(name: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
    return value || fallback;
}

/**
 * Extract theme colors from CSS custom properties.
 * Returns a ChartTheme object for use in chart configuration.
 */
export function getUPlotTheme(): ChartTheme {
    return {
        background: 'transparent',
        cardBg: getCSSVariable('--cardBg', DEFAULT_THEME.cardBg),
        textPrimary: getCSSVariable('--textPrimary', DEFAULT_THEME.textPrimary),
        textSecondary: getCSSVariable('--textSecondary', DEFAULT_THEME.textSecondary),
        accent: getCSSVariable('--accent', DEFAULT_THEME.accent),
        border: getCSSVariable('--border', DEFAULT_THEME.border),
        gridLine: getCSSVariable('--gridLine', DEFAULT_THEME.gridLine),
    };
}

// --- Axes Builder ---

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
function buildAxes(config: ChartConfig): uPlot.Axis[] {
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

// --- Scales Builder ---

/** Default minimum range for flat data to ensure visible scale */
const DEFAULT_MIN_RANGE = 5;

/**
 * Calculate smart Y-axis range with minimum spread for flat data.
 * Prevents invisible scales when all values are the same (e.g., all zeros for snowfall).
 */
function getSmartRange(
    dataMin: number,
    dataMax: number,
    domain: [number | 'auto', number | 'auto'],
    minRange: number = DEFAULT_MIN_RANGE
): [number, number] {
    // Apply domain constraints
    let min = domain[0] === 'auto' ? dataMin : (domain[0] as number);
    let max = domain[1] === 'auto' ? dataMax : (domain[1] as number);

    const range = max - min;

    // Handle flat data (range is very small or zero)
    // This commonly happens with snowfall when all values are 0
    if (range < minRange) {
        const center = (min + max) / 2;

        // If domain has a fixed minimum (like 0 for snowfall), respect it
        if (domain[0] !== 'auto') {
            // Fixed min, expand max only
            max = min + minRange;
        } else if (domain[1] !== 'auto') {
            // Fixed max, expand min only
            min = max - minRange;
        } else {
            // Both auto, expand symmetrically from center
            min = center - minRange / 2;
            max = center + minRange / 2;
        }
    }

    // Add padding (5% of range or minimum range, whichever is used)
    const effectiveRange = max - min;
    const padding = effectiveRange * 0.05;

    return [
        domain[0] === 'auto' ? min - padding : min,
        domain[1] === 'auto' ? max + padding : max,
    ];
}

/**
 * Build scales configuration for uPlot.
 * Handles primary and secondary Y-axis scales with optional domain constraints.
 */
function buildScales(config: ChartConfig): Record<string, uPlot.Scale> {
    const primaryDomain = config.yAxis.domain ?? ['auto', 'auto'];

    const scales: Record<string, uPlot.Scale> = {
        // X-axis scale (numeric indices for category data)
        x: {
            time: false, // Not a time scale, using indices
        },

        // Primary Y-axis scale with smart minimum range
        y: {
            auto: primaryDomain[0] === 'auto' && primaryDomain[1] === 'auto',
            range: (
                _u: uPlot,
                dataMin: number,
                dataMax: number
            ): [number, number] => {
                return getSmartRange(dataMin, dataMax, primaryDomain);
            },
        },
    };

    // Add secondary Y-axis scale if defined
    if (config.yAxisSecondary) {
        const secondaryDomain = config.yAxisSecondary.domain ?? ['auto', 'auto'];

        scales.y2 = {
            auto: secondaryDomain[0] === 'auto' && secondaryDomain[1] === 'auto',
            range: (
                _u: uPlot,
                dataMin: number,
                dataMax: number
            ): [number, number] => {
                return getSmartRange(dataMin, dataMax, secondaryDomain);
            },
        };
    }

    return scales;
}

// --- Option Builder ---

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

    // Build plugins array using consolidated plugin architecture
    const plugins: uPlot.Plugin[] = [];

    // 1. Advanced zoom: wheel zoom + drag pan + optional range selector
    plugins.push(advancedZoomPlugin(config.dataZoom, theme));

    // 2. Interactive overlay: tooltip + point snapping + highlight indicators
    const xAxisLabels = config.xAxis.type === 'category' ? config.xAxis.data : undefined;
    plugins.push(interactiveOverlayPlugin(config.tooltip, config.series, theme, xAxisLabels));

    // 3. Band fill for uncertainty/range visualization
    plugins.push(bandFillPlugin(config.series));

    // 4. Smart labels with collision detection
    plugins.push(smartLabelsPlugin(config.series, theme));

    // 5. Mark lines (horizontal reference lines) if configured
    if (config.markLines && config.markLines.length > 0) {
        plugins.push(markLinesPlugin(config.markLines, theme));
    }

    // 6. Interactive legend for series toggle
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

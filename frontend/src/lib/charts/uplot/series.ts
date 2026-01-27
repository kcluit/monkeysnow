/**
 * uPlot Series Builders
 *
 * Builds uPlot series configurations for different chart types.
 */

import type { SeriesConfig } from '../types';
import type uPlot from 'uplot';

/**
 * Apply opacity to a color.
 * Converts hex colors to rgba format.
 */
export function applyOpacity(color: string, opacity: number): string {
    if (opacity >= 1) return color;

    // Parse hex color
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Already rgba - extract and apply new opacity
    if (color.startsWith('rgba')) {
        const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
        if (match) {
            return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
        }
    }

    // rgb to rgba
    if (color.startsWith('rgb(')) {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
        }
    }

    return color;
}

/**
 * Convert line style to dash array.
 */
function getDashPattern(style?: 'solid' | 'dashed' | 'dotted'): number[] | undefined {
    switch (style) {
        case 'dashed':
            return [8, 4];
        case 'dotted':
            return [2, 3];
        default:
            return undefined;
    }
}

/**
 * Build a line series configuration for uPlot.
 */
export function buildLineSeries(config: SeriesConfig): uPlot.Series {
    const opacity = config.opacity ?? 1;
    const strokeColor = applyOpacity(config.color, opacity);

    return {
        label: config.name,
        stroke: strokeColor,
        width: config.lineWidth ?? 2,
        dash: getDashPattern(config.lineStyle),
        scale: config.yAxisIndex === 1 ? 'y2' : 'y',
        points: { show: false },
        spanGaps: false, // Don't connect across null values
    };
}

/**
 * Build an area series configuration for uPlot.
 * Area charts are line charts with fill.
 */
export function buildAreaSeries(config: SeriesConfig): uPlot.Series {
    const opacity = config.opacity ?? 1;
    const fillOpacity = (config.fillOpacity ?? 0.3) * opacity;
    const strokeColor = applyOpacity(config.color, opacity);
    const fillColor = applyOpacity(config.color, fillOpacity);

    return {
        label: config.name,
        stroke: strokeColor,
        width: config.lineWidth ?? 2,
        fill: fillColor,
        scale: config.yAxisIndex === 1 ? 'y2' : 'y',
        points: { show: false },
        spanGaps: false,
    };
}

/**
 * Build a bar series configuration for uPlot.
 * uPlot doesn't have native bar support, so we use custom paths.
 */
export function buildBarSeries(
    config: SeriesConfig,
    seriesIndex: number,
    totalBarSeries: number
): uPlot.Series {
    const opacity = config.opacity ?? 0.8;
    const fillColor = applyOpacity(config.color, opacity);

    return {
        label: config.name,
        scale: config.yAxisIndex === 1 ? 'y2' : 'y',
        points: { show: false },
        // Custom bar drawing via paths function
        paths: (u: uPlot, seriesIdx: number, idx0: number, idx1: number) => {
            const stroke = new Path2D();
            const fill = new Path2D();

            // Validate data exists
            if (!u.data || !u.data[seriesIdx] || !u.data[0]) {
                return { stroke, fill };
            }

            const data = u.data[seriesIdx] as (number | null)[];
            const xData = u.data[0] as number[];

            // Calculate bar width based on visible data points
            const xScale = u.scales.x;
            if (xScale.min == null || xScale.max == null) return { stroke, fill };

            const plotWidth = u.bbox.width;
            // Calculate number of visible points (add 1 because indices are inclusive)
            const visiblePoints = Math.floor(xScale.max) - Math.floor(xScale.min) + 1;
            const pointSpacing = plotWidth / Math.max(visiblePoints, 1);
            const barGroupWidth = pointSpacing * 0.8; // 80% of available space
            const barWidth = barGroupWidth / Math.max(totalBarSeries, 1);

            // Offset for this bar in the group
            const groupOffset = -barGroupWidth / 2;
            const barOffset = groupOffset + seriesIndex * barWidth + barWidth / 2;

            for (let i = idx0; i <= idx1; i++) {
                if (i < 0 || i >= data.length) continue;
                const val = data[i];
                if (val == null) continue;

                const x = u.valToPos(xData[i], 'x', true);
                const scale = config.yAxisIndex === 1 ? 'y2' : 'y';
                const y = u.valToPos(val, scale, true);
                const y0 = u.valToPos(0, scale, true);

                const barX = x + barOffset - barWidth / 2;
                const barHeight = y0 - y;

                fill.rect(barX, y, barWidth, barHeight);
            }

            return { stroke, fill };
        },
        stroke: 'transparent',
        fill: fillColor,
    };
}

/**
 * Build a band series configuration for uPlot.
 * Band series are rendered by the bandFillPlugin, not directly by uPlot.
 * We create a hidden series to hold the data and allow proper scale calculation.
 */
export function buildBandSeries(config: SeriesConfig): uPlot.Series {
    // Band series don't render directly - they're drawn by bandFillPlugin
    // But we need a series entry for proper data array indexing
    return {
        label: config.name,
        show: false, // Hidden - rendered by plugin
        scale: config.yAxisIndex === 1 ? 'y2' : 'y',
    };
}

/**
 * Build a series configuration based on chart type.
 */
export function buildSeries(
    config: SeriesConfig,
    seriesIndex: number,
    totalBarSeries: number
): uPlot.Series {
    switch (config.type) {
        case 'bar':
            return buildBarSeries(config, seriesIndex, totalBarSeries);
        case 'area':
            return buildAreaSeries(config);
        case 'band':
            return buildBandSeries(config);
        case 'line':
        default:
            return buildLineSeries(config);
    }
}

/**
 * Build all series configurations from ChartConfig.
 * Note: First uPlot series (index 0) is always for x-axis, so we start at index 1.
 */
export function buildSeriesArray(config: { series: SeriesConfig[] }): uPlot.Series[] {
    // Count bar series for width calculation
    const barSeriesIndices: number[] = [];
    config.series.forEach((s, i) => {
        if (s.type === 'bar') barSeriesIndices.push(i);
    });
    const totalBarSeries = barSeriesIndices.length;

    // Build series configs
    return config.series.map((s, i) => {
        const barIndex = barSeriesIndices.indexOf(i);
        return buildSeries(s, barIndex >= 0 ? barIndex : 0, totalBarSeries);
    });
}

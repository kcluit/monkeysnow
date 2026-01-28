/**
 * Heatmap Plugin
 *
 * Draws an hour-of-day heatmap matrix visualization.
 * Y-axis: hours (0-23), X-axis: dates, color: value intensity.
 * Useful for visualizing daily patterns across multiple days.
 */

import type uPlot from 'uplot';
import type { SeriesConfig, ChartTheme } from '../types';

export interface HeatmapPluginOptions {
    /** Series configuration with heatmapData */
    series: SeriesConfig;
    /** Min/max values for color scaling */
    valueRange: [number, number];
    /** Theme for colors */
    theme: ChartTheme;
}

/**
 * Interpolate between two colors based on a ratio (0-1).
 */
function interpolateColor(color1: [number, number, number], color2: [number, number, number], ratio: number): string {
    const r = Math.round(color1[0] + (color2[0] - color1[0]) * ratio);
    const g = Math.round(color1[1] + (color2[1] - color1[1]) * ratio);
    const b = Math.round(color1[2] + (color2[2] - color1[2]) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Get color for a normalized value (0-1).
 * Uses a blue -> cyan -> green -> yellow -> red gradient.
 */
function getHeatmapColor(normalized: number): string {
    // Clamp to 0-1 range
    const t = Math.max(0, Math.min(1, normalized));

    // Color stops: blue (0) -> cyan (0.25) -> green (0.5) -> yellow (0.75) -> red (1)
    const colors: [number, number, number][] = [
        [59, 130, 246],   // Blue (#3b82f6)
        [6, 182, 212],    // Cyan (#06b6d4)
        [34, 197, 94],    // Green (#22c55e)
        [234, 179, 8],    // Yellow (#eab308)
        [239, 68, 68],    // Red (#ef4444)
    ];

    if (t <= 0) return `rgb(${colors[0].join(',')})`;
    if (t >= 1) return `rgb(${colors[colors.length - 1].join(',')})`;

    const segment = (colors.length - 1) * t;
    const index = Math.floor(segment);
    const ratio = segment - index;

    return interpolateColor(colors[index], colors[Math.min(index + 1, colors.length - 1)], ratio);
}

export function createHeatmapPlugin(options: HeatmapPluginOptions): uPlot.Plugin {
    const { series, valueRange, theme } = options;

    if (!series.heatmapData) {
        return { hooks: {} };
    }

    function draw(u: uPlot) {
        if (!series.heatmapData) return;

        const ctx = u.ctx;
        ctx.save();

        // Clip to chart area
        ctx.beginPath();
        ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
        ctx.clip();

        const { hours, dates, values } = series.heatmapData;
        const [minVal, maxVal] = valueRange;
        const range = maxVal - minVal;

        // Calculate cell dimensions
        const numDates = dates.length;
        const numHours = 24;
        const cellWidth = u.bbox.width / numDates;
        const cellHeight = u.bbox.height / numHours;

        // Draw cells
        for (let h = 0; h < numHours; h++) {
            for (let d = 0; d < numDates; d++) {
                const value = values[h]?.[d];
                if (value === null || value === undefined || !Number.isFinite(value)) {
                    // Draw empty cell with subtle background
                    ctx.fillStyle = theme.gridColor;
                    ctx.globalAlpha = 0.1;
                    const x = u.bbox.left + d * cellWidth;
                    const y = u.bbox.top + (numHours - 1 - h) * cellHeight; // Invert so hour 0 is at bottom
                    ctx.fillRect(x, y, cellWidth, cellHeight);
                    ctx.globalAlpha = 1;
                    continue;
                }

                // Normalize value to 0-1 range
                const normalized = range > 0 ? (value - minVal) / range : 0.5;
                ctx.fillStyle = getHeatmapColor(normalized);

                const x = u.bbox.left + d * cellWidth;
                const y = u.bbox.top + (numHours - 1 - h) * cellHeight; // Invert so hour 0 is at bottom

                ctx.fillRect(x, y, cellWidth, cellHeight);

                // Draw cell border
                ctx.strokeStyle = theme.background;
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, cellWidth, cellHeight);
            }
        }

        // Draw hour labels on left side
        ctx.fillStyle = theme.textSecondary;
        ctx.font = '10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let h = 0; h < numHours; h += 3) { // Every 3 hours
            const y = u.bbox.top + (numHours - 1 - h) * cellHeight + cellHeight / 2;
            const label = `${h.toString().padStart(2, '0')}:00`;
            ctx.fillText(label, u.bbox.left - 4, y);
        }

        ctx.restore();
    }

    return {
        hooks: {
            // Draw during the draw phase (after axes, before series)
            draw: [draw],
        },
    };
}

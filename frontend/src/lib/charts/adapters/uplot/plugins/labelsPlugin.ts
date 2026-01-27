/**
 * Labels Plugin for uPlot
 *
 * Renders value labels on data points for series with showLabels=true.
 * Optimized to only render labels for visible points.
 */

import type { SeriesConfig, ChartTheme } from '../../../types';
import type uPlot from 'uplot';

/**
 * Create a plugin that renders data point labels.
 */
export function labelsPlugin(
    seriesConfigs: SeriesConfig[],
    theme: ChartTheme
): uPlot.Plugin {
    // Check if any series has labels enabled
    const hasLabels = seriesConfigs.some((s) => s.showLabels === true);

    if (!hasLabels) {
        return { hooks: {} };
    }

    return {
        hooks: {
            draw: (u: uPlot) => {
                const ctx = u.ctx;
                const { left, top, width, height } = u.bbox;

                u.series.forEach((s, i) => {
                    if (i === 0) return; // Skip x-axis
                    if (s.show === false) return; // Skip hidden series

                    const seriesConfig = seriesConfigs[i - 1];
                    if (!seriesConfig || seriesConfig.showLabels !== true) return;

                    // Validate data exists
                    if (!u.data || !u.data[0] || !u.data[i]) return;

                    const data = u.data[i] as (number | null)[];
                    const xData = u.data[0] as number[];
                    const scale = s.scale ?? 'y';

                    // Get visible x range
                    const xScale = u.scales.x;
                    if (xScale.min == null || xScale.max == null) return;

                    const startIdx = Math.max(0, Math.floor(xScale.min));
                    const endIdx = Math.min(data.length - 1, Math.ceil(xScale.max));

                    ctx.save();
                    ctx.fillStyle = theme.textPrimary;
                    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';

                    // Calculate label skip interval based on visible range
                    const visiblePoints = endIdx - startIdx + 1;
                    const maxLabels = Math.floor(width / 40); // ~40px per label minimum
                    const skipInterval = Math.max(1, Math.ceil(visiblePoints / maxLabels));

                    // Draw labels at data points
                    for (let idx = startIdx; idx <= endIdx; idx += skipInterval) {
                        const value = data[idx];
                        if (value == null) continue;

                        const x = u.valToPos(xData[idx], 'x', true);
                        const y = u.valToPos(value, scale, true);

                        // Skip if outside plot area
                        if (x < left || x > left + width || y < top || y > top + height)
                            continue;

                        // Format label
                        const label =
                            Math.abs(value) >= 100
                                ? Math.round(value).toString()
                                : value.toFixed(1);

                        // Draw label above the point
                        ctx.fillText(label, x, y - 4);
                    }

                    ctx.restore();
                });
            },
        },
    };
}

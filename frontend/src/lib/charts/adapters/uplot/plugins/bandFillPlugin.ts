/**
 * Band Fill Plugin for uPlot
 *
 * Draws filled bands between upper and lower bounds (e.g., min/max or percentile ranges).
 * Used for visualizing forecast uncertainty.
 */

import type { SeriesConfig } from '../../../types';
import type uPlot from 'uplot';
import { applyOpacity } from '../seriesBuilders';

/**
 * Create a plugin that draws filled bands between series bounds.
 */
export function bandFillPlugin(seriesConfigs: SeriesConfig[]): uPlot.Plugin {
    // Filter series with band configuration
    const bandsToRender: Array<{
        seriesIdx: number;
        config: SeriesConfig;
    }> = [];

    seriesConfigs.forEach((config, idx) => {
        if (config.type === 'band' && config.bandData) {
            bandsToRender.push({ seriesIdx: idx + 1, config }); // +1 for x-axis offset
        }
    });

    if (bandsToRender.length === 0) {
        return { hooks: {} };
    }

    return {
        hooks: {
            draw: (u: uPlot) => {
                const ctx = u.ctx;
                const { left, width, top, height } = u.bbox;

                bandsToRender.forEach(({ config }) => {
                    if (!config.bandData) return;

                    const { upper, lower } = config.bandData;
                    const scale = config.yAxisIndex === 1 ? 'y2' : 'y';
                    const fillOpacity = config.fillOpacity ?? 0.15;
                    const fillColor = applyOpacity(config.color, fillOpacity);

                    // Get visible x range
                    const xScale = u.scales.x;
                    if (xScale.min == null || xScale.max == null) return;

                    const startIdx = Math.max(0, Math.floor(xScale.min));
                    const endIdx = Math.min(upper.length - 1, Math.ceil(xScale.max));

                    ctx.save();
                    ctx.fillStyle = fillColor;

                    // Build path for band fill
                    ctx.beginPath();

                    // Forward path (top edge - upper bounds)
                    let started = false;
                    let lastValidX = 0;
                    let lastValidY = 0;

                    for (let i = startIdx; i <= endIdx; i++) {
                        const upperVal = upper[i];
                        if (upperVal == null) continue;

                        const x = u.valToPos(i, 'x', true);
                        const y = u.valToPos(upperVal, scale, true);

                        // Skip if outside plot area
                        if (x < left || x > left + width) continue;

                        if (!started) {
                            ctx.moveTo(x, y);
                            started = true;
                        } else {
                            ctx.lineTo(x, y);
                        }
                        lastValidX = x;
                        lastValidY = y;
                    }

                    if (!started) {
                        ctx.restore();
                        return;
                    }

                    // Reverse path (bottom edge - lower bounds)
                    for (let i = endIdx; i >= startIdx; i--) {
                        const lowerVal = lower[i];
                        if (lowerVal == null) continue;

                        const x = u.valToPos(i, 'x', true);
                        const y = u.valToPos(lowerVal, scale, true);

                        // Skip if outside plot area
                        if (x < left || x > left + width) continue;

                        ctx.lineTo(x, y);
                    }

                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                });
            },
        },
    };
}

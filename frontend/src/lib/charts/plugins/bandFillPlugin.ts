/**
 * Band Fill Plugin
 *
 * Draws filled bands between upper and lower bounds for range visualization.
 * Used for min-max and percentile ranges.
 */

import type uPlot from 'uplot';
import type { SeriesConfig } from '../types';
import { colorWithOpacity } from '../utils/colorUtils';

export interface BandFillPluginOptions {
    /** Series configurations that include band data */
    series: SeriesConfig[];
}

export function createBandFillPlugin(options: BandFillPluginOptions): uPlot.Plugin {
    const bandSeries = options.series.filter((s) => s.type === 'band' && s.bandData);

    if (bandSeries.length === 0) {
        return { hooks: {} };
    }

    function draw(u: uPlot) {
        const ctx = u.ctx;

        ctx.save();

        for (const series of bandSeries) {
            if (!series.bandData) continue;

            const { upper, lower } = series.bandData;
            const fillOpacity = series.fillOpacity ?? 0.1;
            const fillColor = colorWithOpacity(series.color, fillOpacity);

            ctx.fillStyle = fillColor;

            const pathPoints: Array<{ x: number; yUpper: number; yLower: number }> = [];

            // Collect valid points
            for (let i = 0; i < upper.length; i++) {
                const upperVal = upper[i];
                const lowerVal = lower[i];

                if (upperVal === null || lowerVal === null) {
                    // Draw accumulated path if any
                    if (pathPoints.length > 0) {
                        drawBandPath(ctx, pathPoints);
                        pathPoints.length = 0;
                    }
                    continue;
                }

                const x = u.valToPos(i, 'x', true);
                const yUpper = u.valToPos(upperVal, 'y', true);
                const yLower = u.valToPos(lowerVal, 'y', true);

                pathPoints.push({ x, yUpper, yLower });
            }

            // Draw remaining path
            if (pathPoints.length > 0) {
                drawBandPath(ctx, pathPoints);
            }
        }

        ctx.restore();
    }

    return {
        hooks: {
            drawSeries: [draw],
        },
    };
}

function drawBandPath(
    ctx: CanvasRenderingContext2D,
    points: Array<{ x: number; yUpper: number; yLower: number }>
): void {
    if (points.length < 2) return;

    ctx.beginPath();

    // Draw upper line (left to right)
    ctx.moveTo(points[0].x, points[0].yUpper);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].yUpper);
    }

    // Draw lower line (right to left)
    for (let i = points.length - 1; i >= 0; i--) {
        ctx.lineTo(points[i].x, points[i].yLower);
    }

    ctx.closePath();
    ctx.fill();
}

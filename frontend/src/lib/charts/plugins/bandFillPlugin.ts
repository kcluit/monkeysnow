/**
 * Band Fill Plugin
 *
 * Draws filled bands between upper and lower bounds for range visualization.
 * Used for min-max and percentile ranges.
 */

import type uPlot from 'uplot';
import type { SeriesConfig } from '../types';

export interface BandFillPluginOptions {
    /** Series configurations that include band data */
    series: SeriesConfig[];
}

/**
 * Parse color and apply opacity.
 */
function colorWithOpacity(color: string, opacity: number): string {
    // Handle hex colors
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        let r: number, g: number, b: number;

        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        }

        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Handle rgb/rgba colors
    if (color.startsWith('rgb')) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
        }
    }

    // Fallback
    return color;
}

export function createBandFillPlugin(options: BandFillPluginOptions): uPlot.Plugin {
    const bandSeries = options.series.filter((s) => s.type === 'band' && s.bandData);

    if (bandSeries.length === 0) {
        return { hooks: {} };
    }

    function draw(u: uPlot) {
        const ctx = u.ctx;
        const { left, top, width, height } = u.bbox;

        ctx.save();

        for (const series of bandSeries) {
            if (!series.bandData) continue;

            const { upper, lower } = series.bandData;
            const fillOpacity = series.fillOpacity ?? 0.1;
            const fillColor = colorWithOpacity(series.color, fillOpacity);

            ctx.beginPath();
            ctx.fillStyle = fillColor;

            let started = false;
            const pathPoints: Array<{ x: number; yUpper: number; yLower: number }> = [];

            // Collect valid points
            for (let i = 0; i < upper.length; i++) {
                const upperVal = upper[i];
                const lowerVal = lower[i];

                if (upperVal === null || lowerVal === null) {
                    // Draw accumulated path if any
                    if (pathPoints.length > 0) {
                        drawBandPath(ctx, u, pathPoints, left, top, width, height);
                        pathPoints.length = 0;
                    }
                    started = false;
                    continue;
                }

                const x = u.valToPos(i, 'x', true);
                const yUpper = u.valToPos(upperVal, 'y', true);
                const yLower = u.valToPos(lowerVal, 'y', true);

                pathPoints.push({ x, yUpper, yLower });
            }

            // Draw remaining path
            if (pathPoints.length > 0) {
                drawBandPath(ctx, u, pathPoints, left, top, width, height);
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
    u: uPlot,
    points: Array<{ x: number; yUpper: number; yLower: number }>,
    left: number,
    top: number,
    width: number,
    height: number
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

/**
 * Wind Arrow Plugin
 *
 * Overlays directional arrows on wind speed charts showing wind direction.
 * Arrows are drawn at regular intervals, rotated to match compass direction.
 * Wind direction uses meteorological convention (direction wind is coming FROM).
 */

import type uPlot from 'uplot';
import type { SeriesConfig } from '../types';

export interface WindArrowPluginOptions {
    /** Series configuration with windArrowData */
    series: SeriesConfig;
    /** Arrow size in pixels (default: 14) */
    arrowSize?: number;
    /** Spacing between arrows in data points (default: 6) */
    spacing?: number;
}

export function createWindArrowPlugin(options: WindArrowPluginOptions): uPlot.Plugin {
    const { series, arrowSize = 14, spacing = 6 } = options;

    if (!series.windArrowData) {
        return { hooks: {} };
    }

    function draw(u: uPlot) {
        if (!series.windArrowData) return;

        const ctx = u.ctx;
        ctx.save();

        // Clip to chart area
        ctx.beginPath();
        ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
        ctx.clip();

        const { direction } = series.windArrowData;
        const color = series.color;

        // Draw arrows at the bottom third of the chart
        const arrowY = u.bbox.top + u.bbox.height * 0.85;

        for (let i = 0; i < direction.length; i += spacing) {
            const dir = direction[i];
            if (dir === null || !Number.isFinite(dir)) continue;

            const x = u.valToPos(i, 'x', true);
            if (!Number.isFinite(x)) continue;

            // Convert meteorological direction (degrees from north, clockwise) to canvas angle
            // Canvas: 0 = right, 90 = down
            // Meteorological: 0 = from north (down in canvas), 90 = from east (left in canvas)
            // Arrow points in direction wind is going TO (opposite of FROM)
            const angleRad = ((dir + 180) * Math.PI) / 180;

            drawArrow(ctx, x, arrowY, angleRad, arrowSize, color);
        }

        ctx.restore();
    }

    return {
        hooks: {
            draw: [draw],
        },
    };
}

/**
 * Draw a single directional arrow.
 * @param ctx - Canvas context
 * @param x - X position
 * @param y - Y position
 * @param angle - Direction in radians (0 = right, increases clockwise)
 * @param size - Arrow size in pixels
 * @param color - Arrow color
 */
function drawArrow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    size: number,
    color: string
): void {
    ctx.save();

    ctx.translate(x, y);
    ctx.rotate(angle);

    const halfSize = size / 2;
    const headLength = size * 0.4;
    const headWidth = size * 0.35;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw arrow shaft
    ctx.beginPath();
    ctx.moveTo(-halfSize, 0);
    ctx.lineTo(halfSize - headLength, 0);
    ctx.stroke();

    // Draw arrow head (filled triangle)
    ctx.beginPath();
    ctx.moveTo(halfSize, 0);
    ctx.lineTo(halfSize - headLength, -headWidth / 2);
    ctx.lineTo(halfSize - headLength, headWidth / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

/**
 * Zero Axis Plugin
 *
 * Draws a bold line at y=0 in textSecondary color (like a standard graph axis)
 * for variables where data crosses zero. Improves readability for temperature
 * charts and other metrics where zero is a meaningful threshold.
 */

import type uPlot from 'uplot';
import type { ChartTheme } from '../types';

export interface ZeroAxisPluginOptions {
    /** Theme for color extraction */
    theme: ChartTheme;
    /** Line width for zero axis (default: 2) */
    lineWidth?: number;
}

export function createZeroAxisPlugin(options: ZeroAxisPluginOptions): uPlot.Plugin {
    const { theme, lineWidth = 2 } = options;

    function draw(u: uPlot) {
        const yScale = u.scales.y;
        if (!yScale) return;

        const yMin = yScale.min;
        const yMax = yScale.max;

        // Only draw if y-scale includes zero (data crosses zero)
        if (yMin === undefined || yMax === undefined || yMin > 0 || yMax < 0) {
            return;
        }

        const ctx = u.ctx;
        ctx.save();

        // Get the y position for value 0
        const y = u.valToPos(0, 'y', true);

        // Skip if y position is invalid
        if (!Number.isFinite(y)) {
            ctx.restore();
            return;
        }

        const left = u.bbox.left;
        const width = u.bbox.width;

        // Draw bold zero line in textSecondary color (standard axis style)
        ctx.strokeStyle = theme.textSecondary;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + width, y);
        ctx.stroke();

        ctx.restore();
    }

    return {
        hooks: {
            draw: [draw],
        },
    };
}

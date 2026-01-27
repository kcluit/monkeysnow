/**
 * Mark Lines Plugin
 *
 * Draws horizontal reference lines with labels (e.g., elevation markers).
 */

import type uPlot from 'uplot';
import type { MarkLineData, ChartTheme } from '../types';

export interface MarkLinesPluginOptions {
    markLines: MarkLineData[];
    theme: ChartTheme;
}

export function createMarkLinesPlugin(options: MarkLinesPluginOptions): uPlot.Plugin {
    const { markLines, theme } = options;

    if (!markLines || markLines.length === 0) {
        return { hooks: {} };
    }

    function draw(u: uPlot) {
        const ctx = u.ctx;
        const { left, top, width, height } = u.bbox;

        ctx.save();

        for (const line of markLines) {
            const yPos = u.valToPos(line.yValue, 'y', true);

            // Skip if outside plot area
            if (yPos < top || yPos > top + height) continue;

            // Draw line
            ctx.beginPath();
            ctx.strokeStyle = line.color;
            ctx.lineWidth = line.lineWidth;

            if (line.lineStyle === 'dashed') {
                ctx.setLineDash([6, 4]);
            } else {
                ctx.setLineDash([]);
            }

            ctx.moveTo(left, yPos);
            ctx.lineTo(left + width, yPos);
            ctx.stroke();

            // Draw label
            ctx.setLineDash([]);
            ctx.font = '11px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = line.color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';

            // Add small background for readability
            const textMetrics = ctx.measureText(line.label);
            const textHeight = 12;
            const padding = 4;
            const textX = left + 8;
            const textY = yPos - 4;

            ctx.fillStyle = theme.background;
            ctx.globalAlpha = 0.8;
            ctx.fillRect(
                textX - padding / 2,
                textY - textHeight - padding / 2,
                textMetrics.width + padding,
                textHeight + padding
            );

            ctx.globalAlpha = 1;
            ctx.fillStyle = line.color;
            ctx.fillText(line.label, textX, textY);
        }

        ctx.restore();
    }

    return {
        hooks: {
            draw: [draw],
        },
    };
}

/**
 * Mark Lines Plugin for uPlot
 *
 * Draws horizontal reference lines on the chart.
 */

import type { MarkLineData, ChartTheme } from '../../types';
import type uPlot from 'uplot';

/**
 * Create a plugin that draws horizontal mark lines.
 */
export function markLinesPlugin(
    markLines: MarkLineData[],
    _theme: ChartTheme
): uPlot.Plugin {
    if (!markLines || markLines.length === 0) {
        return { hooks: {} };
    }

    return {
        hooks: {
            draw: (u: uPlot) => {
                const ctx = u.ctx;
                const { left, width, top, height } = u.bbox;

                markLines.forEach((ml) => {
                    // Get Y position for the mark line value
                    const y = u.valToPos(ml.yValue, 'y', true);

                    // Skip if outside visible area
                    if (y < top || y > top + height) return;

                    ctx.save();

                    // Line styling
                    ctx.strokeStyle = ml.color;
                    ctx.lineWidth = ml.lineWidth;

                    // Apply dash pattern
                    if (ml.lineStyle === 'dashed') {
                        ctx.setLineDash([8, 4]);
                    } else if (ml.lineStyle === 'dotted') {
                        ctx.setLineDash([2, 3]);
                    } else {
                        ctx.setLineDash([]);
                    }

                    // Draw the line
                    ctx.beginPath();
                    ctx.moveTo(left, y);
                    ctx.lineTo(left + width, y);
                    ctx.stroke();

                    // Draw label
                    ctx.fillStyle = ml.color;
                    ctx.font = `${ml.lineWidth >= 2 ? 'bold ' : ''}11px system-ui, -apple-system, sans-serif`;
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(ml.label, left + width - 4, y - 4);

                    ctx.restore();
                });
            },
        },
    };
}

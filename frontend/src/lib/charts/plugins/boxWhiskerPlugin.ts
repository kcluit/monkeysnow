/**
 * Box & Whisker Plugin
 *
 * Draws box-whisker visualization for ensemble data spread.
 * Shows min/Q1/median/Q3/max values across all models at each time point.
 */

import uPlot from 'uplot';
import type { ChartConfig } from '../types';
import { colorWithOpacity } from '../utils/colorUtils';

export interface BoxWhiskerPluginOptions {
    /** Latest chart configuration; its box & whisker series are drawn */
    getConfig: () => ChartConfig;
    /** Box width as fraction of spacing (default: 0.6) */
    boxWidthFactor?: number;
}

export function createBoxWhiskerPlugin(options: BoxWhiskerPluginOptions): uPlot.Plugin {
    const { getConfig } = options;
    const boxWidthFactor = options.boxWidthFactor ?? 0.6;

    // uPlot fires drawSeries after each series, so the boxes are drawn in their own series' turn only
    function draw(u: uPlot, seriesIdx: number) {
        const series = getConfig().series[seriesIdx - 1];
        if (series?.type !== 'boxwhisker' || !series.boxWhiskerData) return;

        const { min, q1, median, q3, max } = series.boxWhiskerData;
        const fillColor = colorWithOpacity(series.color, 0.3);
        const strokeColor = series.color;

        // Calculate box width based on data spacing
        const dataLen = min.length;
        if (dataLen < 2) return;

        const ctx = u.ctx;
        // The canvas is in device pixels, so line widths scale to stay the same CSS size
        const pxRatio = uPlot.pxRatio;
        ctx.save();

        // Clip to chart area
        ctx.beginPath();
        ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
        ctx.clip();

        const x0 = u.valToPos(0, 'x', true);
        const x1 = u.valToPos(1, 'x', true);
        const spacing = Math.abs(x1 - x0);
        const boxWidth = spacing * boxWidthFactor;

        for (let i = 0; i < dataLen; i++) {
            const minVal = min[i];
            const q1Val = q1[i];
            const medianVal = median[i];
            const q3Val = q3[i];
            const maxVal = max[i];

            // Skip null/invalid values
            if (
                minVal === null || q1Val === null || medianVal === null ||
                q3Val === null || maxVal === null ||
                !Number.isFinite(minVal) || !Number.isFinite(q1Val) ||
                !Number.isFinite(medianVal) || !Number.isFinite(q3Val) ||
                !Number.isFinite(maxVal)
            ) {
                continue;
            }

            const x = u.valToPos(i, 'x', true);
            const yMin = u.valToPos(minVal, 'y', true);
            const yQ1 = u.valToPos(q1Val, 'y', true);
            const yMedian = u.valToPos(medianVal, 'y', true);
            const yQ3 = u.valToPos(q3Val, 'y', true);
            const yMax = u.valToPos(maxVal, 'y', true);

            // Skip if positions are invalid
            if (
                !Number.isFinite(x) || !Number.isFinite(yMin) ||
                !Number.isFinite(yQ1) || !Number.isFinite(yMedian) ||
                !Number.isFinite(yQ3) || !Number.isFinite(yMax)
            ) {
                continue;
            }

            // Draw whisker line (min to max)
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = pxRatio;
            ctx.beginPath();
            ctx.moveTo(x, yMin);
            ctx.lineTo(x, yMax);
            ctx.stroke();

            // Draw min cap (horizontal line at min)
            ctx.beginPath();
            ctx.moveTo(x - boxWidth / 4, yMin);
            ctx.lineTo(x + boxWidth / 4, yMin);
            ctx.stroke();

            // Draw max cap (horizontal line at max)
            ctx.beginPath();
            ctx.moveTo(x - boxWidth / 4, yMax);
            ctx.lineTo(x + boxWidth / 4, yMax);
            ctx.stroke();

            // Draw box (Q1 to Q3) - note: canvas y-axis is inverted
            const boxTop = Math.min(yQ1, yQ3);
            const boxBottom = Math.max(yQ1, yQ3);
            const boxHeight = boxBottom - boxTop;

            // Fill box
            ctx.fillStyle = fillColor;
            ctx.fillRect(x - boxWidth / 2, boxTop, boxWidth, boxHeight);

            // Stroke box
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2 * pxRatio;
            ctx.strokeRect(x - boxWidth / 2, boxTop, boxWidth, boxHeight);

            // Draw median line
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2 * pxRatio;
            ctx.beginPath();
            ctx.moveTo(x - boxWidth / 2, yMedian);
            ctx.lineTo(x + boxWidth / 2, yMedian);
            ctx.stroke();
        }

        ctx.restore();
    }

    return {
        hooks: {
            drawSeries: [draw],
        },
    };
}

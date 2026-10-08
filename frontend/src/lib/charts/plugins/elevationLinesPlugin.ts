/**
 * Elevation Lines Plugin
 *
 * Draws horizontal reference lines at base, mid, and top elevations
 * for freezing level charts. Shows where ski resort elevations are
 * relative to the freezing level throughout the forecast period.
 */

import uPlot from 'uplot';
import type { ChartConfig } from '../types';

export interface ElevationLinesPluginOptions {
    /** Latest chart configuration; lines come from its elevationLines (already in display units) */
    getConfig: () => ChartConfig;
    /** Line width (default: 1) */
    lineWidth?: number;
}

export function createElevationLinesPlugin(options: ElevationLinesPluginOptions): uPlot.Plugin {
    const { getConfig, lineWidth = 1 } = options;

    function draw(u: uPlot) {
        const { elevationLines, theme } = getConfig();
        const yScale = u.scales.y;
        if (!yScale || !elevationLines) return;
        const { unit, ...elevations } = elevationLines;

        const ctx = u.ctx;
        ctx.save();

        const left = u.bbox.left;
        const width = u.bbox.width;

        // Define elevations array with labels; a Saved location has one elevation, not three bands
        const elevationEntries = elevations.base === elevations.mid && elevations.mid === elevations.top
            ? [{ value: elevations.mid, label: 'Elevation' }]
            : [
                { value: elevations.base, label: 'Base' },
                { value: elevations.mid, label: 'Mid' },
                { value: elevations.top, label: 'Top' },
            ];

        // Set up styles for lines and labels; the canvas is in device pixels, so CSS sizes scale by pxRatio
        const pxRatio = uPlot.pxRatio;
        ctx.strokeStyle = theme.textSecondary;
        ctx.lineWidth = lineWidth * pxRatio;
        ctx.fillStyle = theme.textSecondary;
        ctx.font = `${11 * pxRatio}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        for (const entry of elevationEntries) {
            // Skip if elevation is invalid
            if (typeof entry.value !== 'number' || !Number.isFinite(entry.value)) {
                continue;
            }

            // Get y position for this elevation value
            const y = u.valToPos(entry.value, 'y', true);

            // Skip if position is invalid
            if (!Number.isFinite(y)) {
                continue;
            }

            // Draw horizontal line
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(left + width, y);
            ctx.stroke();

            // Draw label at right edge
            const labelText = `${entry.label}: ${Math.round(entry.value)}${unit}`;

            // Position label slightly inside the right edge with padding
            const labelX = left + width - 5 * pxRatio;
            // Position label above the line (textBaseline is 'bottom')
            ctx.fillText(labelText, labelX, y - 3 * pxRatio);
        }

        ctx.restore();
    }

    return {
        hooks: {
            draw: [draw],
        },
    };
}

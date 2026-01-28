/**
 * Elevation Lines Plugin
 *
 * Draws horizontal reference lines at base, mid, and top elevations
 * for freezing level charts. Shows where ski resort elevations are
 * relative to the freezing level throughout the forecast period.
 */

import type uPlot from 'uplot';
import type { ChartTheme } from '../types';

export interface ElevationLinesPluginOptions {
    /** Theme for color extraction */
    theme: ChartTheme;
    /** Elevation values to draw lines for (already in display units - meters or feet) */
    elevations: {
        base: number;
        mid: number;
        top: number;
    };
    /** Unit string for labels (m or ft) */
    unit: string;
    /** Line width (default: 1) */
    lineWidth?: number;
}

export function createElevationLinesPlugin(options: ElevationLinesPluginOptions): uPlot.Plugin {
    const { theme, elevations, unit, lineWidth = 1 } = options;

    function draw(u: uPlot) {
        const yScale = u.scales.y;
        if (!yScale) return;

        const ctx = u.ctx;
        ctx.save();

        const left = u.bbox.left;
        const width = u.bbox.width;

        // Define elevations array with labels
        const elevationEntries = [
            { value: elevations.base, label: 'Base' },
            { value: elevations.mid, label: 'Mid' },
            { value: elevations.top, label: 'Top' },
        ];

        // Set up styles for lines and labels
        ctx.strokeStyle = theme.textSecondary;
        ctx.lineWidth = lineWidth;
        ctx.fillStyle = theme.textSecondary;
        ctx.font = '11px system-ui, -apple-system, sans-serif';
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
            const labelX = left + width - 5;
            // Position label above the line (textBaseline is 'bottom')
            ctx.fillText(labelText, labelX, y - 3);
        }

        ctx.restore();
    }

    return {
        hooks: {
            draw: [draw],
        },
    };
}

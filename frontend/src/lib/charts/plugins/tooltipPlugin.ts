/**
 * Tooltip Plugin
 *
 * Displays all visible series values at the cursor position with a vertical cursor line.
 */

import type uPlot from 'uplot';
import type { ChartTheme } from '../types';

export interface TooltipPluginOptions {
    theme: ChartTheme;
    /** Format series value for display */
    formatValue: (seriesIdx: number, value: number | null | undefined) => string;
    /** X-axis labels for tooltip header */
    xLabels: string[];
}

export function createTooltipPlugin(options: TooltipPluginOptions): uPlot.Plugin {
    const { theme, formatValue, xLabels } = options;

    let tooltip: HTMLElement | null = null;
    let cursorLine: HTMLElement | null = null;

    function init(u: uPlot) {
        // Create cursor line
        cursorLine = document.createElement('div');
        Object.assign(cursorLine.style, {
            position: 'absolute',
            top: '0',
            bottom: '0',
            width: '1px',
            background: theme.accent,
            opacity: '0.5',
            pointerEvents: 'none',
            display: 'none',
            zIndex: '10',
        });
        u.over.appendChild(cursorLine);

        // Create tooltip
        tooltip = document.createElement('div');
        Object.assign(tooltip.style, {
            position: 'absolute',
            display: 'none',
            pointerEvents: 'none',
            padding: '8px 12px',
            background: theme.tooltipBg,
            border: `1px solid ${theme.tooltipBorder}`,
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'inherit',
            zIndex: '1000',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            maxWidth: '280px',
            maxHeight: '300px',
            overflowY: 'auto',
        });
        u.over.appendChild(tooltip);
    }

    function setCursor(u: uPlot) {
        if (!tooltip || !cursorLine) return;

        const { left, idx } = u.cursor;

        if (idx === null || idx === undefined || left === null || left === undefined || left < 0) {
            tooltip.style.display = 'none';
            cursorLine.style.display = 'none';
            return;
        }

        // Position cursor line
        cursorLine.style.left = `${left}px`;
        cursorLine.style.display = 'block';

        // Build tooltip content
        const lines: string[] = [];

        // Header with time label
        const xLabel = xLabels[idx] ?? '';
        lines.push(
            `<div style="color: ${theme.textSecondary}; font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid ${theme.tooltipBorder}; padding-bottom: 4px;">${xLabel}</div>`
        );

        // Series values
        let hasVisibleSeries = false;
        for (let i = 1; i < u.series.length; i++) {
            const series = u.series[i];
            if (!series.show) continue;

            hasVisibleSeries = true;
            const value = u.data[i]?.[idx];
            const formattedValue = formatValue(i, value);
            const color = (series.stroke as string) || '#666';
            const label = series.label || `Series ${i}`;

            lines.push(
                `<div style="display: flex; align-items: center; gap: 8px; margin: 3px 0;">` +
                    `<span style="width: 12px; height: 3px; background: ${color}; flex-shrink: 0; border-radius: 1px;"></span>` +
                    `<span style="color: ${theme.textSecondary}; flex-shrink: 0;">${label}:</span>` +
                    `<span style="color: ${theme.textPrimary}; font-weight: 500;">${formattedValue}</span>` +
                    `</div>`
            );
        }

        if (!hasVisibleSeries) {
            tooltip.style.display = 'none';
            return;
        }

        tooltip.innerHTML = lines.join('');
        tooltip.style.display = 'block';

        // Position tooltip
        const plotWidth = u.over.offsetWidth;
        const plotHeight = u.over.offsetHeight;
        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;

        let tooltipLeft = left + 15;
        let tooltipTop = 10;

        // Keep within bounds (prefer right side, flip if needed)
        if (tooltipLeft + tooltipWidth > plotWidth - 10) {
            tooltipLeft = left - tooltipWidth - 15;
        }
        // Ensure minimum left position
        if (tooltipLeft < 10) {
            tooltipLeft = 10;
        }
        // Keep within vertical bounds
        if (tooltipTop + tooltipHeight > plotHeight - 10) {
            tooltipTop = Math.max(10, plotHeight - tooltipHeight - 10);
        }

        tooltip.style.left = `${tooltipLeft}px`;
        tooltip.style.top = `${tooltipTop}px`;
    }

    function destroy() {
        tooltip?.remove();
        cursorLine?.remove();
        tooltip = null;
        cursorLine = null;
    }

    return {
        hooks: {
            init: [init],
            setCursor: [setCursor],
            destroy: [destroy],
        },
    };
}

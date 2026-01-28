/**
 * Tooltip Plugin
 *
 * Simple tooltip that shows values for all series at the closest data point.
 * Based on uPlot's tooltips-closest demo.
 */

import type uPlot from 'uplot';
import type { ChartConfig } from '../types';

export interface TooltipPluginOptions {
    /** Chart configuration for accessing series metadata */
    config: ChartConfig;
}

export function createTooltipPlugin(options: TooltipPluginOptions): uPlot.Plugin {
    const { config } = options;

    let tooltip: HTMLDivElement | null = null;
    let over: HTMLElement | null = null;

    function showTooltip() {
        if (tooltip) {
            tooltip.style.display = 'block';
        }
    }

    function hideTooltip() {
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    function setTooltip(u: uPlot) {
        if (!tooltip) return;

        const { left, top, idx } = u.cursor;

        if (idx === null || idx === undefined || left === undefined || top === undefined) {
            hideTooltip();
            return;
        }

        // Get x-axis label
        const xLabel = config.xAxis.data[idx] || '';

        // Build tooltip content
        let content = `<div><strong>${xLabel}</strong></div>`;

        for (let i = 1; i < u.series.length; i++) {
            const series = u.series[i];
            const seriesConfig = config.series[i - 1];

            if (!series.show || !seriesConfig) continue;

            const value = u.data[i][idx];
            if (value === null || value === undefined) continue;

            const formattedValue = value.toFixed(2);
            const color = seriesConfig.color;

            content += `<div><span style="color:${color}">●</span> ${seriesConfig.name}: ${formattedValue}</div>`;
        }

        tooltip.innerHTML = content;

        // Position tooltip
        const rect = over!.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let tooltipLeft = left + 10;
        let tooltipTop = top + 10;

        // Keep tooltip within bounds
        if (tooltipLeft + tooltipRect.width > rect.width) {
            tooltipLeft = left - tooltipRect.width - 10;
        }
        if (tooltipTop + tooltipRect.height > rect.height) {
            tooltipTop = top - tooltipRect.height - 10;
        }

        tooltip.style.left = tooltipLeft + 'px';
        tooltip.style.top = tooltipTop + 'px';

        showTooltip();
    }

    return {
        hooks: {
            init: [
                (u: uPlot) => {
                    over = u.over;

                    // Create tooltip element
                    tooltip = document.createElement('div');
                    tooltip.className = 'uplot-tooltip';
                    tooltip.style.position = 'absolute';
                    tooltip.style.display = 'none';
                    tooltip.style.pointerEvents = 'none';
                    tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
                    tooltip.style.color = '#fff';
                    tooltip.style.padding = '4px 8px';
                    tooltip.style.fontSize = '12px';
                    tooltip.style.borderRadius = '4px';
                    tooltip.style.zIndex = '100';
                    tooltip.style.whiteSpace = 'nowrap';

                    over.appendChild(tooltip);
                },
            ],
            setCursor: [setTooltip],
            destroy: [
                () => {
                    if (tooltip && tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                    tooltip = null;
                    over = null;
                },
            ],
        },
    };
}

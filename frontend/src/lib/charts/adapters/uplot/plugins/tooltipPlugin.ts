/**
 * Enhanced Tooltip Plugin for uPlot
 *
 * Displays all series values at cursor position in a custom overlay.
 * Supports custom formatting and configurable interaction modes.
 */

import type { TooltipConfig, ChartTheme, TooltipParams } from '../../../types';
import type uPlot from 'uplot';

/** Throttle interval for tooltip updates (ms) */
const TOOLTIP_THROTTLE_MS = 16; // ~60fps

/** Delay before showing tooltip in 'stop' mode (ms) */
const STOP_MODE_DELAY_MS = 150;

/**
 * Create a plugin that displays an enhanced multi-series tooltip.
 */
export function tooltipPlugin(
    tooltipConfig: TooltipConfig | undefined,
    theme: ChartTheme,
    xAxisLabels?: string[]
): uPlot.Plugin {
    if (!tooltipConfig || !tooltipConfig.enabled) {
        return { hooks: {} };
    }

    let tooltipEl: HTMLElement | null = null;
    let lastUpdateTime = 0;
    let stopModeTimeout: ReturnType<typeof setTimeout> | null = null;

    return {
        hooks: {
            init: (u: uPlot) => {
                // Create tooltip element
                tooltipEl = document.createElement('div');
                tooltipEl.className = 'uplot-tooltip';
                tooltipEl.style.cssText = `
                    position: absolute;
                    display: none;
                    background: ${theme.cardBg};
                    border: 1px solid ${theme.border};
                    border-radius: 6px;
                    padding: 10px 12px;
                    font-size: 12px;
                    color: ${theme.textPrimary};
                    pointer-events: none;
                    z-index: 1000;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    max-width: 350px;
                    max-height: 400px;
                    overflow-y: auto;
                `;

                // Append to chart container (not body for better positioning)
                u.root.appendChild(tooltipEl);
            },

            setCursor: (u: uPlot) => {
                const now = Date.now();

                // Throttle updates
                if (now - lastUpdateTime < TOOLTIP_THROTTLE_MS) {
                    return;
                }
                lastUpdateTime = now;

                const { left, idx } = u.cursor;

                // Hide tooltip if no valid cursor position
                if (left == null || idx == null || !tooltipEl) {
                    if (tooltipEl) {
                        tooltipEl.style.display = 'none';
                    }
                    if (stopModeTimeout) {
                        clearTimeout(stopModeTimeout);
                        stopModeTimeout = null;
                    }
                    return;
                }

                const showTooltip = () => {
                    if (!tooltipEl || u.cursor.idx == null) return;

                    const dataIdx = u.cursor.idx;

                    // Get x-axis value
                    const xValue = xAxisLabels?.[dataIdx] ?? String(u.data[0]?.[dataIdx] ?? dataIdx);

                    // Build tooltip params from all series
                    const params: TooltipParams[] = [];
                    u.series.forEach((s, i) => {
                        if (i === 0) return; // Skip x-axis
                        if (s.show === false) return; // Skip hidden series

                        const value = u.data[i]?.[dataIdx];

                        // Skip null values unless showAllSeries is explicitly true
                        if (value == null && tooltipConfig.showAllSeries !== true) return;

                        const color =
                            typeof s.stroke === 'function'
                                ? theme.textSecondary
                                : (s.stroke as string) ?? theme.textSecondary;

                        params.push({
                            seriesName: typeof s.label === 'string' ? s.label : `Series ${i}`,
                            value: value as number,
                            color,
                            axisValue: xValue,
                        });
                    });

                    // Skip if no data to show
                    if (params.length === 0) {
                        tooltipEl.style.display = 'none';
                        return;
                    }

                    // Format content
                    const content = tooltipConfig.formatter
                        ? tooltipConfig.formatter(params)
                        : formatDefaultTooltip(params, xValue, theme);

                    tooltipEl.innerHTML = content;
                    tooltipEl.style.display = 'block';

                    // Position tooltip - prefer right side of cursor, flip if needed
                    const cursorLeft = u.cursor.left ?? 0;
                    const chartWidth = u.bbox.width;
                    const tooltipWidth = tooltipEl.offsetWidth;

                    // Add offset from cursor
                    const offset = 15;
                    let tooltipLeft = cursorLeft + offset;

                    // Flip to left side if would overflow
                    if (tooltipLeft + tooltipWidth > chartWidth) {
                        tooltipLeft = cursorLeft - tooltipWidth - offset;
                    }

                    // Ensure not negative
                    tooltipLeft = Math.max(0, tooltipLeft);

                    tooltipEl.style.left = `${tooltipLeft}px`;
                    tooltipEl.style.top = '10px';
                };

                // Handle interaction mode
                if (tooltipConfig.interactionMode === 'stop') {
                    // Clear existing timeout
                    if (stopModeTimeout) {
                        clearTimeout(stopModeTimeout);
                    }

                    // Hide tooltip while moving
                    if (tooltipEl) {
                        tooltipEl.style.display = 'none';
                    }

                    // Show tooltip after delay
                    stopModeTimeout = setTimeout(showTooltip, STOP_MODE_DELAY_MS);
                } else {
                    // 'move' mode - show immediately
                    showTooltip();
                }
            },

            destroy: () => {
                if (stopModeTimeout) {
                    clearTimeout(stopModeTimeout);
                }
                tooltipEl?.remove();
                tooltipEl = null;
            },
        },
    };
}

/**
 * Format default tooltip HTML content.
 */
function formatDefaultTooltip(
    params: TooltipParams[],
    xValue: string,
    theme: ChartTheme
): string {
    const rows = params
        .map((p) => {
            const valueStr = p.value != null ? p.value.toFixed(1) : 'N/A';
            return `
                <div style="display: flex; align-items: center; gap: 8px; padding: 2px 0;">
                    <span style="width: 10px; height: 10px; background: ${p.color}; border-radius: 50%; flex-shrink: 0;"></span>
                    <span style="flex: 1; color: ${theme.textSecondary}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.seriesName}</span>
                    <span style="font-weight: 600; font-variant-numeric: tabular-nums;">${valueStr}</span>
                </div>
            `;
        })
        .join('');

    return `
        <div style="font-weight: 600; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid ${theme.border}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${xValue}
        </div>
        ${rows}
    `;
}

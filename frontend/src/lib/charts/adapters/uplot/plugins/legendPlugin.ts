/**
 * Legend Plugin for uPlot
 *
 * Creates a custom legend element below the chart.
 */

import type { LegendConfig, ChartTheme } from '../../../types';
import type uPlot from 'uplot';

/**
 * Create a plugin that renders a legend below/above the chart.
 */
export function legendPlugin(
    legendConfig: LegendConfig | undefined,
    theme: ChartTheme
): uPlot.Plugin {
    if (!legendConfig || !legendConfig.enabled) {
        return { hooks: {} };
    }

    let legendEl: HTMLElement | null = null;

    return {
        hooks: {
            init: (u: uPlot) => {
                // Create legend container
                legendEl = document.createElement('div');
                legendEl.className = 'uplot-legend';
                legendEl.style.cssText = `
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px 16px;
                    padding: 8px 4px;
                    font-size: 12px;
                    color: ${theme.textSecondary};
                    ${legendConfig.position === 'bottom' ? 'margin-top: 8px;' : 'margin-bottom: 8px;'}
                `;

                // Build legend items from series
                u.series.forEach((s, i) => {
                    // Skip first series (x-axis)
                    if (i === 0) return;

                    const item = document.createElement('div');
                    item.style.cssText = `
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        white-space: nowrap;
                    `;

                    // Color indicator
                    const dot = document.createElement('span');
                    const color =
                        typeof s.stroke === 'function'
                            ? theme.textSecondary
                            : (s.stroke as string) ?? theme.textSecondary;
                    dot.style.cssText = `
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        background-color: ${color};
                        flex-shrink: 0;
                    `;

                    // Label text
                    const labelSpan = document.createElement('span');
                    // s.label can be string or HTMLElement in uPlot types
                    const labelText = typeof s.label === 'string' ? s.label : `Series ${i}`;
                    labelSpan.textContent = labelText;
                    labelSpan.style.cssText = `
                        overflow: hidden;
                        text-overflow: ellipsis;
                    `;

                    item.appendChild(dot);
                    item.appendChild(labelSpan);
                    legendEl!.appendChild(item);
                });

                // Append to chart container
                if (legendConfig.position === 'bottom') {
                    u.root.appendChild(legendEl);
                } else {
                    u.root.insertBefore(legendEl, u.root.firstChild);
                }
            },

            destroy: () => {
                legendEl?.remove();
                legendEl = null;
            },
        },
    };
}

/**
 * Interactive Legend Plugin for uPlot
 *
 * Creates a custom legend element with optional click-to-toggle functionality.
 * Series visibility can be toggled by clicking legend items when interactive mode is enabled.
 */

import type { LegendConfig, ChartTheme } from '../../../types';
import type uPlot from 'uplot';

/**
 * Create a plugin that renders an interactive legend.
 */
export function legendPlugin(
    legendConfig: LegendConfig | undefined,
    theme: ChartTheme
): uPlot.Plugin {
    if (!legendConfig || !legendConfig.enabled) {
        return { hooks: {} };
    }

    let legendEl: HTMLElement | null = null;
    const legendItems: Map<number, HTMLElement> = new Map();

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
                    const isVisible = s.show !== false;

                    item.style.cssText = `
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        white-space: nowrap;
                        ${legendConfig.interactive ? 'cursor: pointer; user-select: none;' : ''}
                        opacity: ${isVisible ? '1' : '0.4'};
                        transition: opacity 0.15s ease;
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
                    const labelText = typeof s.label === 'string' ? s.label : `Series ${i}`;
                    labelSpan.textContent = labelText;
                    labelSpan.style.cssText = `
                        overflow: hidden;
                        text-overflow: ellipsis;
                    `;

                    item.appendChild(dot);
                    item.appendChild(labelSpan);

                    // Add click handler for interactive mode
                    if (legendConfig.interactive) {
                        item.addEventListener('click', () => {
                            const currentlyVisible = u.series[i].show !== false;
                            const newVisibility = !currentlyVisible;

                            // Toggle series visibility in uPlot
                            u.setSeries(i, { show: newVisibility });

                            // Update visual feedback
                            item.style.opacity = newVisibility ? '1' : '0.4';
                        });

                        // Add hover effect
                        item.addEventListener('mouseenter', () => {
                            if (u.series[i].show !== false) {
                                item.style.backgroundColor = `${theme.border}40`;
                            }
                        });
                        item.addEventListener('mouseleave', () => {
                            item.style.backgroundColor = 'transparent';
                        });
                    }

                    legendItems.set(i, item);
                    legendEl!.appendChild(item);
                });

                // Append to chart container
                if (legendConfig.position === 'bottom') {
                    u.root.appendChild(legendEl);
                } else {
                    u.root.insertBefore(legendEl, u.root.firstChild);
                }
            },

            // Update legend items when series visibility changes externally
            setSeries: (u: uPlot, seriesIdx: number) => {
                const item = legendItems.get(seriesIdx);
                if (item) {
                    const isVisible = u.series[seriesIdx].show !== false;
                    item.style.opacity = isVisible ? '1' : '0.4';
                }
            },

            destroy: () => {
                legendEl?.remove();
                legendEl = null;
                legendItems.clear();
            },
        },
    };
}

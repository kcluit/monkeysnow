/**
 * Legend Plugin
 *
 * Renders an interactive legend below the chart.
 * Click to toggle series visibility, shift+click to solo.
 * Based on uPlot's series.show API and tooltips-closest demo pattern.
 */

import type uPlot from 'uplot';
import type { ChartConfig } from '../types';

export interface LegendPluginOptions {
    /** Chart configuration for accessing series metadata */
    config: ChartConfig;
}

export function createLegendPlugin(options: LegendPluginOptions): uPlot.Plugin {
    const { config } = options;

    let legend: HTMLDivElement | null = null;
    let legendItems: HTMLDivElement[] = [];

    function updateLegend(u: uPlot) {
        if (!legend) return;

        // Clear existing items
        legend.innerHTML = '';
        legendItems = [];

        // Render series (skip index 0, which is x-axis)
        for (let i = 1; i < u.series.length; i++) {
            const series = u.series[i];
            const seriesConfig = config.series[i - 1];
            if (!seriesConfig) continue;

            const item = document.createElement('div');
            item.className = 'uplot-legend-item';
            item.style.display = 'inline-flex';
            item.style.alignItems = 'center';
            item.style.gap = '6px';
            item.style.padding = '4px 8px';
            item.style.cursor = 'pointer';
            item.style.borderRadius = '4px';
            item.style.transition = 'background-color 0.15s ease, opacity 0.15s ease';
            item.style.opacity = series.show ? '1' : '0.4';

            // Bullet
            const bullet = document.createElement('span');
            bullet.style.width = '10px';
            bullet.style.height = '10px';
            bullet.style.borderRadius = '50%';
            bullet.style.backgroundColor = seriesConfig.color;
            bullet.style.display = 'inline-block';
            bullet.style.flexShrink = '0';

            // Label
            const label = document.createElement('span');
            label.textContent = seriesConfig.name;
            label.style.fontSize = '12px';
            label.style.color = config.theme.textPrimary;
            label.style.whiteSpace = 'nowrap';

            item.appendChild(bullet);
            item.appendChild(label);

            // Click handler
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (e.shiftKey) {
                    // Shift+click: Solo this series (hide all others)
                    u.batch(() => {
                        for (let j = 1; j < u.series.length; j++) {
                            u.setSeries(j, { show: j === i });
                        }
                    });
                } else {
                    // Regular click: Toggle this series
                    u.setSeries(i, { show: !series.show });
                }

                // Defer legend update to avoid recursion during batch operations
                requestAnimationFrame(() => updateLegend(u));
            });

            // Hover effect
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = config.theme.tooltipBg;
            });
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });

            legend.appendChild(item);
            legendItems.push(item);
        }
    }

    return {
        hooks: {
            init: [
                (u: uPlot) => {
                    // Create legend container
                    legend = document.createElement('div');
                    legend.className = 'uplot-legend';
                    legend.style.display = 'flex';
                    legend.style.flexWrap = 'wrap';
                    legend.style.gap = '4px';
                    legend.style.padding = '4px 4px 0 4px';
                    legend.style.borderTop = `1px solid ${config.theme.gridColor}`;
                    legend.style.marginTop = '0';

                    // Append to chart root (below canvas)
                    u.root.appendChild(legend);

                    // Initial render
                    updateLegend(u);
                },
            ],
            destroy: [
                () => {
                    if (legend && legend.parentNode) {
                        legend.parentNode.removeChild(legend);
                    }
                    legend = null;
                    legendItems = [];
                },
            ],
        },
    };
}

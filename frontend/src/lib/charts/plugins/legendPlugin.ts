/**
 * Legend Plugin
 *
 * Interactive legend with click-to-toggle series visibility.
 */

import type uPlot from 'uplot';
import type { ChartTheme } from '../types';

export interface LegendPluginOptions {
    theme: ChartTheme;
    /** Callback when series visibility changes */
    onToggle?: (seriesIdx: number, visible: boolean) => void;
}

export function createLegendPlugin(options: LegendPluginOptions): uPlot.Plugin {
    const { theme, onToggle } = options;

    let legend: HTMLElement | null = null;
    const items: HTMLElement[] = [];

    function init(u: uPlot) {
        legend = document.createElement('div');
        legend.className = 'uplot-legend';
        Object.assign(legend.style, {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 16px',
            padding: '8px 4px',
            fontSize: '12px',
            justifyContent: 'center',
        });

        // Build legend items (skip first series which is x-axis)
        for (let i = 1; i < u.series.length; i++) {
            const series = u.series[i];
            const item = document.createElement('div');
            item.className = 'uplot-legend-item';
            Object.assign(item.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                opacity: series.show ? '1' : '0.4',
                transition: 'opacity 0.15s',
                padding: '2px 4px',
                borderRadius: '4px',
            });

            // Color marker
            const marker = document.createElement('span');
            Object.assign(marker.style, {
                width: '16px',
                height: '3px',
                background: (series.stroke as string) || '#666',
                borderRadius: '1px',
                flexShrink: '0',
            });

            // Label
            const label = document.createElement('span');
            const labelText = typeof series.label === 'string' ? series.label : `Series ${i}`;
            label.textContent = labelText;
            label.style.color = theme.textPrimary;
            label.style.whiteSpace = 'nowrap';

            item.appendChild(marker);
            item.appendChild(label);

            // Click handler
            const seriesIdx = i;
            item.addEventListener('click', () => {
                const newVisible = !u.series[seriesIdx].show;
                u.setSeries(seriesIdx, { show: newVisible });
                item.style.opacity = newVisible ? '1' : '0.4';
                onToggle?.(seriesIdx, newVisible);
            });

            // Hover effect
            item.addEventListener('mouseenter', () => {
                item.style.background = theme.gridColor;
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });

            items.push(item);
            legend.appendChild(item);
        }

        // Insert legend after the chart canvas
        u.root.appendChild(legend);
    }

    function destroy() {
        legend?.remove();
        legend = null;
        items.length = 0;
    }

    return {
        hooks: {
            init: [init],
            destroy: [destroy],
        },
    };
}

/**
 * Legend Plugin
 *
 * Renders an interactive legend below the chart.
 * Click to toggle series visibility, shift+click to solo, double-click (or double-tap) to
 * lock or unlock its line. Pointing at an entry with a mouse focuses its line.
 * Based on uPlot's series.show API and tooltips-closest demo pattern.
 */

import type uPlot from 'uplot';
import type { ChartConfig } from '../types';
import type { SeriesFocusPluginResult } from './seriesFocusPlugin';

/** Longest gap between two taps on one entry that still counts as a double-tap */
const DOUBLE_TAP_MS = 300;

export interface LegendPluginOptions {
    /** Latest chart configuration, for series metadata */
    getConfig: () => ChartConfig;
    /** Focus state, previewed on hover and locked on double-click */
    seriesFocus: SeriesFocusPluginResult;
}

interface LegendItem {
    seriesIdx: number;
    item: HTMLDivElement;
    bullet: HTMLSpanElement;
    label: HTMLSpanElement;
}

export function createLegendPlugin(options: LegendPluginOptions): uPlot.Plugin {
    const { getConfig, seriesFocus } = options;

    let legend: HTMLDivElement | null = null;
    let legendItems: LegendItem[] = [];
    let hoveredIdx: number | null = null;
    // Taps can't be told from clicks by the click event itself on every browser
    let lastPointerType = 'mouse';
    let lastTap: { seriesIdx: number; time: number } | null = null;
    // A double-click's first click may hide the Locked line, which unlocks it
    let firstClick: { seriesIdx: number; lockedLine: string | null } | null = null;

    /** Restyle the entries in place, so a double-click lands on the same element twice */
    function refreshLegend(u: uPlot) {
        const config = getConfig();
        const focusedLine = seriesFocus.getFocusedLine();
        const lockedLine = seriesFocus.getLockedLine();

        for (const { seriesIdx, item, bullet, label } of legendItems) {
            const seriesConfig = config.series[seriesIdx - 1];
            if (!seriesConfig) continue;
            const line = seriesFocus.lineOf(seriesIdx);
            const isLocked = line !== null && line === lockedLine;

            item.style.opacity = u.series[seriesIdx].show ? '1' : '0.4';
            // The hover tint stays on the Locked line, telling it apart from a previewed one
            item.classList.toggle('uplot-legend-item-tinted', isLocked || seriesIdx === hoveredIdx);
            bullet.style.backgroundColor = seriesConfig.color;
            label.textContent = seriesConfig.name;
            label.dataset.text = seriesConfig.name;
            label.style.color = config.theme.textPrimary;
            // Bold when its Model style is, and while its line is focused or locked
            const isBold = seriesConfig.bold || isLocked || (line !== null && line === focusedLine);
            label.style.fontWeight = isBold ? 'var(--weight-bold)' : '';
        }
    }

    function toggleSeries(u: uPlot, seriesIdx: number, solo: boolean) {
        if (solo) {
            // Shift+click: Solo this series (hide all others)
            u.batch(() => {
                for (let j = 1; j < u.series.length; j++) {
                    u.setSeries(j, { show: j === seriesIdx });
                }
            });
        } else {
            // Regular click: Toggle this series
            u.setSeries(seriesIdx, { show: !u.series[seriesIdx].show });
        }
    }

    /** Which click of a double-click this is: 1, 2, or more */
    function clickCount(e: MouseEvent, seriesIdx: number): number {
        if (lastPointerType !== 'touch') return Math.max(e.detail, 1);

        const now = performance.now();
        const isDoubleTap = lastTap !== null && lastTap.seriesIdx === seriesIdx && now - lastTap.time < DOUBLE_TAP_MS;
        // A third tap starts over rather than counting as a triple
        lastTap = isDoubleTap ? null : { seriesIdx, time: now };
        return isDoubleTap ? 2 : 1;
    }

    function handleClick(u: uPlot, seriesIdx: number, e: MouseEvent) {
        const count = clickCount(e, seriesIdx);
        // A triple click leaves the double-click's result alone
        if (count > 2) return;

        if (count === 1) {
            firstClick = { seriesIdx, lockedLine: seriesFocus.getLockedLine() };
        }

        // Both clicks of a double-click toggle, so the line ends up shown again
        toggleSeries(u, seriesIdx, e.shiftKey);

        if (count === 2 && !e.shiftKey && firstClick?.seriesIdx === seriesIdx) {
            const line = seriesFocus.lineOf(seriesIdx);
            seriesFocus.setLockedLine(firstClick.lockedLine === line ? null : line);
        }
    }

    function buildLegend(u: uPlot) {
        if (!legend) return;
        const config = getConfig();

        // Render series (skip index 0, which is x-axis)
        for (let i = 1; i < u.series.length; i++) {
            if (!config.series[i - 1]) continue;

            const item = document.createElement('div');
            item.className = 'uplot-legend-item';
            item.style.display = 'inline-flex';
            item.style.alignItems = 'center';
            item.style.gap = '6px';
            item.style.padding = '4px 8px';
            item.style.cursor = 'pointer';
            item.style.borderRadius = '4px';
            item.style.transition = 'background-color 0.15s ease, opacity 0.15s ease';

            // Bullet
            const bullet = document.createElement('span');
            bullet.style.width = '10px';
            bullet.style.height = '10px';
            bullet.style.borderRadius = '50%';
            bullet.style.display = 'inline-block';
            bullet.style.flexShrink = '0';

            // Label
            const label = document.createElement('span');
            label.className = 'uplot-legend-label';
            label.style.fontSize = '12px';
            label.style.whiteSpace = 'nowrap';

            item.appendChild(bullet);
            item.appendChild(label);

            item.addEventListener('pointerdown', (e) => {
                lastPointerType = e.pointerType;
            });

            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClick(u, i, e);
            });

            // Hover previews the line; a tap's emulated hover would stick, so touch has none
            item.addEventListener('pointerenter', (e) => {
                if (e.pointerType === 'touch') return;
                hoveredIdx = i;
                seriesFocus.previewLine(seriesFocus.lineOf(i));
                refreshLegend(u);
            });
            item.addEventListener('pointerleave', (e) => {
                if (e.pointerType === 'touch') return;
                hoveredIdx = null;
                seriesFocus.previewLine(null);
                refreshLegend(u);
            });

            legend.appendChild(item);
            legendItems.push({ seriesIdx: i, item, bullet, label });
        }

        refreshLegend(u);
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
                    legend.style.borderTop = `1px solid ${getConfig().theme.gridColor}`;
                    legend.style.marginTop = '0';

                    // Append to chart root (below canvas)
                    u.root.appendChild(legend);

                    buildLegend(u);
                    seriesFocus.onChange(() => refreshLegend(u));
                },
            ],
            setSeries: [
                (u: uPlot, _seriesIdx: number | null, opts: uPlot.Series) => {
                    if (opts.show !== undefined) refreshLegend(u);
                },
            ],
            destroy: [
                () => {
                    if (legend && legend.parentNode) {
                        legend.parentNode.removeChild(legend);
                    }
                    legend = null;
                    legendItems = [];
                    hoveredIdx = null;
                    lastTap = null;
                    firstClick = null;
                },
            ],
        },
    };
}

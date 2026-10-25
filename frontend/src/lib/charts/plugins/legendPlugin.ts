/**
 * Legend Plugin
 *
 * Renders an interactive legend below the chart.
 * Click an entry to hold its line (again to release it), shift+click to hide or show it,
 * alt+click to show only it; on a touchscreen, a long-press hides or shows it. Pointing at
 * an entry with a mouse focuses its line.
 * Based on uPlot's series.show API and tooltips-closest demo pattern.
 */

import type uPlot from 'uplot';
import type { ChartConfig } from '../types';
import type { SeriesFocusPluginResult } from './seriesFocusPlugin';
import { translate } from '../../../locales';

/** How long a touch on an entry lasts before it hides or shows the line instead of holding it */
const LONG_PRESS_MS = 500;
/** How far a touch may drift and still be a long-press rather than a scroll */
const LONG_PRESS_SLOP_PX = 10;

/** What clicking an entry does, in the language showing */
function entryHint(): string {
    return translate('chart.legend.entryHint', { alt: /Mac/.test(navigator.platform) ? 'Option' : 'Alt' });
}

export interface LegendPluginOptions {
    /** Latest chart configuration, for series metadata */
    getConfig: () => ChartConfig;
    /** Focus state, previewed on hover and held on click */
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
    // The touch on an entry that may become a long-press
    let press: { x: number; y: number; timer: number } | null = null;
    // A long-press may still be followed by a click, which mustn't then hold the line
    let swallowClick = false;

    /** Restyle and rename the entries in place */
    function refreshLegend(u: uPlot) {
        const config = getConfig();
        const focusedLine = seriesFocus.getFocusedLine();
        const heldLine = seriesFocus.getHeldLine();
        const hint = entryHint();

        for (const { seriesIdx, item, bullet, label } of legendItems) {
            const seriesConfig = config.series[seriesIdx - 1];
            if (!seriesConfig) continue;
            const line = seriesFocus.lineOf(seriesIdx);
            const isHeld = line !== null && line === heldLine;

            item.title = hint;
            item.style.opacity = u.series[seriesIdx].show ? '1' : '0.4';
            // The hover tint stays on the Held line, telling it apart from a previewed one
            item.classList.toggle('uplot-legend-item-tinted', isHeld || seriesIdx === hoveredIdx);
            bullet.style.backgroundColor = seriesConfig.color;
            label.textContent = seriesConfig.name;
            label.dataset.text = seriesConfig.name;
            label.style.color = config.theme.textPrimary;
            // Bold when its Model style is, and while its line is focused or held
            const isBold = seriesConfig.bold || isHeld || (line !== null && line === focusedLine);
            label.style.fontWeight = isBold ? 'var(--weight-bold)' : '';
        }
    }

    /** Hide or show one series; hiding every series of the Held line releases it */
    function toggleSeries(u: uPlot, seriesIdx: number) {
        u.setSeries(seriesIdx, { show: !u.series[seriesIdx].show });
    }

    /** Show only this series, or every series again when it is already the only one shown */
    function soloSeries(u: uPlot, seriesIdx: number) {
        const isAlone = u.series.every((series, j) => j === 0 || series.show === (j === seriesIdx));
        u.batch(() => {
            for (let j = 1; j < u.series.length; j++) {
                u.setSeries(j, { show: isAlone || j === seriesIdx });
            }
        });
    }

    /** Hold this series' line, or release it when it is the Held line; a hidden one is shown first */
    function holdSeries(u: uPlot, seriesIdx: number) {
        const line = seriesFocus.lineOf(seriesIdx);
        if (line === null) return;
        if (!u.series[seriesIdx].show) {
            u.setSeries(seriesIdx, { show: true });
            seriesFocus.setHeldLine(line);
            return;
        }
        seriesFocus.setHeldLine(seriesFocus.getHeldLine() === line ? null : line);
    }

    function cancelPress() {
        if (press) window.clearTimeout(press.timer);
        press = null;
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
                swallowClick = false;
                cancelPress();
                if (e.pointerType !== 'touch') return;
                const timer = window.setTimeout(() => {
                    press = null;
                    swallowClick = true;
                    toggleSeries(u, i);
                }, LONG_PRESS_MS);
                press = { x: e.clientX, y: e.clientY, timer };
            });
            item.addEventListener('pointermove', (e) => {
                if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > LONG_PRESS_SLOP_PX) {
                    cancelPress();
                }
            });
            item.addEventListener('pointerup', cancelPress);
            item.addEventListener('pointercancel', cancelPress);
            // A long-press would open the context menu on some phones
            item.addEventListener('contextmenu', (e) => {
                if (press || swallowClick) e.preventDefault();
            });

            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (swallowClick) {
                    swallowClick = false;
                } else if (e.altKey) {
                    soloSeries(u, i);
                } else if (e.shiftKey) {
                    toggleSeries(u, i);
                } else {
                    holdSeries(u, i);
                }
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
            // A new config comes with its data, and may name the lines anew (a change of language)
            setData: [refreshLegend],
            destroy: [
                () => {
                    if (legend && legend.parentNode) {
                        legend.parentNode.removeChild(legend);
                    }
                    legend = null;
                    legendItems = [];
                    hoveredIdx = null;
                    cancelPress();
                    swallowClick = false;
                },
            ],
        },
    };
}

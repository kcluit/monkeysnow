/**
 * Series Focus Plugin
 *
 * Highlights the focused series by dimming others to 0.3 opacity.
 * Responds to both cursor proximity (via uPlot's cursor.focus) and legend hover.
 * Based on uPlot's tooltips-closest demo pattern.
 */

import type uPlot from 'uplot';

const DIMMED_ALPHA = 0.3;
const FOCUSED_ALPHA = 1;

export interface SeriesFocusPluginOptions {
    // Future extensibility - callbacks, custom opacity, etc.
}

/** Plugin return type with exposed handler for legend integration */
export interface SeriesFocusPluginResult {
    plugin: uPlot.Plugin;
    handleLegendHover: (seriesIdx: number | null) => void;
}

export function createSeriesFocusPlugin(_options?: SeriesFocusPluginOptions): SeriesFocusPluginResult {
    let uplotInstance: uPlot | null = null;
    let focusedSeriesIdx: number | null = null;
    let isLegendHover: boolean = false;

    /**
     * Apply focus effect: dim all visible series except the focused one.
     */
    function applyFocus(u: uPlot, seriesIdx: number | null) {
        if (seriesIdx === focusedSeriesIdx) return; // No change

        focusedSeriesIdx = seriesIdx;

        u.batch(() => {
            for (let i = 1; i < u.series.length; i++) {
                // Skip hidden series to prevent state inconsistency when toggling visibility
                if (!u.series[i].show) continue;

                const alpha = (seriesIdx === null || i === seriesIdx) ? FOCUSED_ALPHA : DIMMED_ALPHA;
                // uPlot supports alpha in setSeries but TypeScript types don't include it
                u.setSeries(i, { alpha } as any);
            }
        });
    }

    /**
     * Find focused series from cursor proximity.
     * Uses uPlot's cursor.idxs which contains data point indices for series within prox distance.
     */
    function findFocusedSeries(u: uPlot): number | null {
        if (!u.cursor.idxs) return null;

        // Find first visible series that has a valid cursor index (within proximity)
        for (let i = 1; i < u.cursor.idxs.length; i++) {
            if (u.cursor.idxs[i] !== null && u.cursor.idxs[i] !== undefined && u.series[i].show) {
                return i;
            }
        }
        return null;
    }

    /**
     * Handle legend hover from external trigger.
     */
    function handleLegendHover(seriesIdx: number | null) {
        if (!uplotInstance) return;

        isLegendHover = seriesIdx !== null;
        applyFocus(uplotInstance, seriesIdx);
    }

    const plugin: uPlot.Plugin = {
        hooks: {
            init: [
                (u: uPlot) => {
                    uplotInstance = u;
                },
            ],
            setCursor: [
                (u: uPlot) => {
                    // Don't override legend hover with cursor focus
                    if (isLegendHover) return;

                    // Find focused series from cursor proximity
                    const cursorFocusIdx = findFocusedSeries(u);
                    applyFocus(u, cursorFocusIdx);
                },
            ],
            destroy: [
                () => {
                    uplotInstance = null;
                    focusedSeriesIdx = null;
                    isLegendHover = false;
                },
            ],
        },
    };

    return { plugin, handleLegendHover };
}

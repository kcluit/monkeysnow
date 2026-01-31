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

export function createSeriesFocusPlugin(_options?: SeriesFocusPluginOptions): uPlot.Plugin {
    let uplotInstance: uPlot | null = null;
    let focusedSeriesIdx: number | null = null;
    let isLegendHover: boolean = false;

    /**
     * Apply focus effect: dim all series except the focused one.
     */
    function applyFocus(u: uPlot, seriesIdx: number | null) {
        if (seriesIdx === focusedSeriesIdx) return; // No change

        focusedSeriesIdx = seriesIdx;

        u.batch(() => {
            for (let i = 1; i < u.series.length; i++) {
                if (seriesIdx === null) {
                    // Clear focus - restore full opacity
                    u.setSeries(i, { alpha: FOCUSED_ALPHA });
                } else if (i === seriesIdx) {
                    // Focused series - full opacity
                    u.setSeries(i, { alpha: FOCUSED_ALPHA });
                } else {
                    // Non-focused series - dim
                    u.setSeries(i, { alpha: DIMMED_ALPHA });
                }
            }
        });
    }

    /**
     * Find focused series from cursor proximity.
     * Uses uPlot's cursor.idxs which contains data point indices for series within prox distance.
     */
    function findFocusedSeries(u: uPlot): number | null {
        if (!u.cursor.idxs) return null;

        // Find first series that has a valid cursor index (within proximity)
        for (let i = 1; i < u.cursor.idxs.length; i++) {
            if (u.cursor.idxs[i] !== null && u.cursor.idxs[i] !== undefined) {
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

    return {
        hooks: {
            init: [
                (u: uPlot) => {
                    uplotInstance = u;

                    // Expose legend hover handler on the uPlot instance for external access
                    (u as any)._seriesFocusPlugin = {
                        handleLegendHover,
                    };
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
                    if (uplotInstance) {
                        delete (uplotInstance as any)._seriesFocusPlugin;
                    }
                    uplotInstance = null;
                    focusedSeriesIdx = null;
                    isLegendHover = false;
                },
            ],
        },
    };
}

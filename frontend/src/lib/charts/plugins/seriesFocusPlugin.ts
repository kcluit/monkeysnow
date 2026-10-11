/**
 * Series Focus Plugin
 *
 * Keeps the Focused line at full strength while every other series fades.
 * The Focused line is the legend entry being pointed at, else the Locked line, else the
 * line nearest the cursor (found by uPlot's cursor focus, whose own fading is turned off).
 * A line is every series sharing a `line` (by default its id), such as a Comparison
 * model's hourly and Accumulation series.
 */

import type uPlot from 'uplot';
import type { ChartConfig } from '../types';

/** How strongly the series around a Focused line are drawn, as uPlot's own focus would */
const FADED_ALPHA = 0.3;

export interface SeriesFocusPluginOptions {
    /** Latest chart configuration, for each series' line */
    getConfig: () => ChartConfig;
    /** The chart's Locked line, kept outside the chart so a rebuild keeps it */
    getLockedLine: () => string | null;
    setLockedLine: (line: string | null) => void;
}

/** Plugin return type, with the focus state the legend and series strokes read */
export interface SeriesFocusPluginResult {
    plugin: uPlot.Plugin;
    /** The line a series belongs to */
    lineOf: (seriesIdx: number) => string | null;
    /** Whether a series belongs to the Focused line */
    isFocused: (seriesIdx: number) => boolean;
    getFocusedLine: () => string | null;
    getLockedLine: () => string | null;
    setLockedLine: (line: string | null) => void;
    /** Focus a line while its legend entry is pointed at; null when the pointer leaves */
    previewLine: (line: string | null) => void;
    /** Re-read the Locked line after it changed outside this chart */
    refresh: () => void;
    /** Called whenever the Focused or Locked line changes */
    onChange: (listener: () => void) => void;
}

export function createSeriesFocusPlugin(options: SeriesFocusPluginOptions): SeriesFocusPluginResult {
    const { getConfig, getLockedLine, setLockedLine } = options;

    let uplotInstance: uPlot | null = null;
    let previewedLine: string | null = null;
    let cursorLine: string | null = null;
    let focusedLine: string | null = null;
    let lockedLine: string | null = null;
    const listeners: Array<() => void> = [];

    function lineOf(seriesIdx: number): string | null {
        const series = getConfig().series[seriesIdx - 1];
        return series ? series.line ?? series.id : null;
    }

    function hasVisibleSeries(u: uPlot, line: string): boolean {
        for (let i = 1; i < u.series.length; i++) {
            if (u.series[i].show && lineOf(i) === line) return true;
        }
        return false;
    }

    /** True when the line is on this chart but every series of it is hidden */
    function isHiddenHere(u: uPlot, line: string): boolean {
        for (let i = 1; i < u.series.length; i++) {
            if (lineOf(i) === line) return !hasVisibleSeries(u, line);
        }
        return false;
    }

    /**
     * Work out the Focused line, and fade everything else when it changes.
     * A line hidden or missing on this chart can't be focused, so the next candidate is.
     */
    function update() {
        const u = uplotInstance;
        if (!u) return;

        const locked = getLockedLine();
        const focused = [previewedLine, locked, cursorLine]
            .find((line): line is string => line !== null && hasVisibleSeries(u, line)) ?? null;
        if (focused === focusedLine && locked === lockedLine) return;

        const focusChanged = focused !== focusedLine;
        focusedLine = focused;
        lockedLine = locked;

        if (focusChanged) {
            for (let i = 1; i < u.series.length; i++) {
                u.series[i].alpha = focused === null || lineOf(i) === focused ? 1 : FADED_ALPHA;
            }
            // Series strokes read isFocused, so cached paths are redrawn in their new colours
            u.redraw(false);
        }

        listeners.forEach((listener) => listener());
    }

    const plugin: uPlot.Plugin = {
        opts: (_u, opts) => {
            // uPlot still finds the series nearest the cursor, but leaves the fading to update()
            opts.focus = { alpha: 1 };
        },
        hooks: {
            init: [
                (u: uPlot) => {
                    uplotInstance = u;
                    update();
                },
            ],
            setSeries: [
                // uPlot's types leave out focus, which its cursor sets
                (u: uPlot, seriesIdx: number | null, opts: { show?: boolean; focus?: boolean }) => {
                    if (opts.focus) {
                        cursorLine = seriesIdx === null ? null : lineOf(seriesIdx);
                    }
                    // Hiding every series of the Locked line ends the lock
                    if (opts.show === false && lockedLine !== null && isHiddenHere(u, lockedLine)) {
                        setLockedLine(null);
                    }
                    update();
                },
            ],
            destroy: [
                () => {
                    uplotInstance = null;
                    previewedLine = null;
                    cursorLine = null;
                    focusedLine = null;
                    lockedLine = null;
                    listeners.length = 0;
                },
            ],
        },
    };

    return {
        plugin,
        lineOf,
        isFocused: (seriesIdx) => focusedLine !== null && lineOf(seriesIdx) === focusedLine,
        getFocusedLine: () => focusedLine,
        getLockedLine: () => lockedLine,
        setLockedLine,
        previewLine: (line) => {
            previewedLine = line;
            update();
        },
        refresh: update,
        onChange: (listener) => {
            listeners.push(listener);
        },
    };
}

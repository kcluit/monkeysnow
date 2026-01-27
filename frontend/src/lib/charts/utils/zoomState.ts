/**
 * Zoom State Utilities
 *
 * Functions for extracting, saving, and restoring zoom state across chart rebuilds.
 * This allows zoom to be preserved when the chart structure changes.
 */

import type uPlot from 'uplot';

/** Represents the current zoom state of a chart */
export interface ZoomState {
    /** Current minimum x value */
    min: number;
    /** Current maximum x value */
    max: number;
    /** Initial (full) minimum x value */
    initialMin: number;
    /** Initial (full) maximum x value */
    initialMax: number;
}

/** Normalized zoom state as percentages (0-1) */
export interface NormalizedZoomState {
    /** Start position as percentage (0-1) */
    start: number;
    /** End position as percentage (0-1) */
    end: number;
}

/**
 * Extract current zoom state from a uPlot instance.
 * Returns null if zoom state cannot be determined.
 */
export function extractZoomState(u: uPlot): ZoomState | null {
    const xScale = u.scales.x;
    if (!xScale || xScale.min === undefined || xScale.max === undefined) {
        return null;
    }

    const min = xScale.min;
    const max = xScale.max;

    // Get initial bounds (stored by zoom plugin)
    const initialMin = (xScale as any)._initialMin ?? min;
    const initialMax = (xScale as any)._initialMax ?? max;

    return { min, max, initialMin, initialMax };
}

/**
 * Normalize zoom state to percentages (0-1).
 * This allows zoom to be translated across different data ranges.
 */
export function normalizeZoomState(state: ZoomState): NormalizedZoomState {
    const range = state.initialMax - state.initialMin;
    if (range === 0) {
        return { start: 0, end: 1 };
    }

    return {
        start: (state.min - state.initialMin) / range,
        end: (state.max - state.initialMin) / range,
    };
}

/**
 * Denormalize zoom state back to absolute values for a new data range.
 */
export function denormalizeZoomState(
    normalized: NormalizedZoomState,
    newInitialMin: number,
    newInitialMax: number
): ZoomState {
    const range = newInitialMax - newInitialMin;
    return {
        min: newInitialMin + normalized.start * range,
        max: newInitialMin + normalized.end * range,
        initialMin: newInitialMin,
        initialMax: newInitialMax,
    };
}

/**
 * Check if zoom state represents a zoomed-in view (not full range).
 */
export function isZoomed(state: ZoomState): boolean {
    const tolerance = 0.001;
    const range = state.initialMax - state.initialMin;
    const currentRange = state.max - state.min;

    // Consider zoomed if current range is less than 99.9% of initial range
    return currentRange < range * (1 - tolerance);
}

/**
 * Apply zoom state to a uPlot instance.
 */
export function applyZoomState(u: uPlot, state: ZoomState): void {
    // Store initial bounds for the zoom plugin
    (u.scales.x as any)._initialMin = state.initialMin;
    (u.scales.x as any)._initialMax = state.initialMax;

    // Set the current zoom level
    u.setScale('x', { min: state.min, max: state.max });
}

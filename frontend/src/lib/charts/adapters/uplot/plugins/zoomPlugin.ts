/**
 * Zoom Plugin for uPlot
 *
 * Enables mouse wheel zoom and drag-to-pan on the X-axis.
 */

import type { DataZoomConfig } from '../../../types';
import type uPlot from 'uplot';

/** Zoom factor per wheel step (20% zoom) */
const ZOOM_FACTOR = 0.8;

/** Throttle interval for zoom events (ms) */
const ZOOM_THROTTLE_MS = 16; // ~60fps

/** WeakMap to store cleanup functions, preventing memory leaks */
const cleanupMap = new WeakMap<uPlot, () => void>();

/**
 * Create a plugin that enables wheel zoom and drag-to-pan.
 */
export function zoomPlugin(zoomConfig: DataZoomConfig | undefined): uPlot.Plugin {
    if (!zoomConfig || zoomConfig.enabled === false) {
        return { hooks: {} };
    }

    return {
        hooks: {
            init: (u: uPlot) => {
                const canvas = u.over;
                if (!canvas) return;

                // State for this chart instance
                let isPanning = false;
                let panStartX = 0;
                let panStartScaleMin = 0;
                let panStartScaleMax = 0;
                let lastZoomTime = 0;

                // Wheel zoom
                const handleWheel = (e: WheelEvent) => {
                    e.preventDefault();

                    // Throttle zoom events
                    const now = Date.now();
                    if (now - lastZoomTime < ZOOM_THROTTLE_MS) return;
                    lastZoomTime = now;

                    const xScale = u.scales.x;
                    if (xScale.min == null || xScale.max == null) return;

                    const range = xScale.max - xScale.min;

                    // Zoom centered on mouse position
                    const rect = canvas.getBoundingClientRect();
                    const mouseXPct = (e.clientX - rect.left) / rect.width;

                    // Zoom in or out based on wheel direction
                    const factor = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
                    const newRange = range * factor;

                    // Calculate new min/max centered on mouse
                    const newMin = xScale.min + (range - newRange) * mouseXPct;
                    const newMax = newMin + newRange;

                    // Clamp to data bounds
                    const dataMin = 0;
                    const dataMax = (u.data[0]?.length ?? 1) - 1;

                    const clampedMin = Math.max(dataMin, newMin);
                    const clampedMax = Math.min(dataMax, newMax);

                    // Ensure min < max
                    if (clampedMin < clampedMax) {
                        u.setScale('x', { min: clampedMin, max: clampedMax });
                    }
                };

                // Pan start
                const handleMouseDown = (e: MouseEvent) => {
                    // Only left button
                    if (e.button !== 0) return;

                    const xScale = u.scales.x;
                    if (xScale.min == null || xScale.max == null) return;

                    isPanning = true;
                    panStartX = e.clientX;
                    panStartScaleMin = xScale.min;
                    panStartScaleMax = xScale.max;

                    // Change cursor
                    canvas.style.cursor = 'grabbing';
                };

                // Pan move
                const handleMouseMove = (e: MouseEvent) => {
                    if (!isPanning) return;

                    const rect = canvas.getBoundingClientRect();
                    const dx = e.clientX - panStartX;
                    const pxPerUnit = rect.width / (panStartScaleMax - panStartScaleMin);
                    const unitOffset = dx / pxPerUnit;

                    // Calculate new bounds
                    let newMin = panStartScaleMin - unitOffset;
                    let newMax = panStartScaleMax - unitOffset;

                    // Clamp to data bounds
                    const dataMin = 0;
                    const dataMax = (u.data[0]?.length ?? 1) - 1;

                    if (newMin < dataMin) {
                        newMax += dataMin - newMin;
                        newMin = dataMin;
                    }
                    if (newMax > dataMax) {
                        newMin -= newMax - dataMax;
                        newMax = dataMax;
                    }

                    // Final clamp and validation
                    newMin = Math.max(dataMin, newMin);
                    newMax = Math.min(dataMax, newMax);

                    if (newMin < newMax) {
                        u.setScale('x', { min: newMin, max: newMax });
                    }
                };

                // Pan end
                const handleMouseUp = () => {
                    if (isPanning) {
                        isPanning = false;
                        canvas.style.cursor = 'crosshair';
                    }
                };

                // Double-click to reset zoom
                const handleDblClick = () => {
                    const dataMax = (u.data[0]?.length ?? 1) - 1;
                    u.setScale('x', { min: 0, max: dataMax });
                };

                // Set initial cursor
                canvas.style.cursor = 'crosshair';

                // Add event listeners
                canvas.addEventListener('wheel', handleWheel, { passive: false });
                canvas.addEventListener('mousedown', handleMouseDown);
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
                canvas.addEventListener('dblclick', handleDblClick);

                // Store cleanup function in WeakMap (automatically garbage collected)
                const cleanup = () => {
                    canvas.removeEventListener('wheel', handleWheel);
                    canvas.removeEventListener('mousedown', handleMouseDown);
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    canvas.removeEventListener('dblclick', handleDblClick);
                };
                cleanupMap.set(u, cleanup);
            },

            destroy: (u: uPlot) => {
                const cleanup = cleanupMap.get(u);
                cleanup?.();
                cleanupMap.delete(u);
            },
        },
    };
}

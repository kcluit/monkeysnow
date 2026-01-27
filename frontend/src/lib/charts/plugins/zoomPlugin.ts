/**
 * Zoom Plugin
 *
 * Provides wheel zoom (centered on cursor) and drag-to-pan functionality.
 * Based on uPlot zoom-wheel.html demo.
 */

import type uPlot from 'uplot';

export interface ZoomPluginOptions {
    /** Zoom factor (0.9 = zoom in 10%, 1.1 = zoom out 10%) */
    factor?: number;
    /** Callback when zoom/pan changes */
    onZoom?: (min: number, max: number) => void;
}

export function createZoomPlugin(options: ZoomPluginOptions = {}): uPlot.Plugin {
    const { factor = 0.9, onZoom } = options;

    return {
        hooks: {
            ready: [(u: uPlot) => {
                const over = u.over;

                // Store initial range for reset
                const initialMin = u.scales.x.min ?? 0;
                const initialMax = u.scales.x.max ?? 1;

                // Wheel zoom
                const onWheel = (e: WheelEvent) => {
                    e.preventDefault();

                    const rect = over.getBoundingClientRect();
                    const left = e.clientX - rect.left;

                    const xMin = u.scales.x.min ?? 0;
                    const xMax = u.scales.x.max ?? 1;
                    const xRange = xMax - xMin;

                    // Get x value at cursor position
                    const xVal = u.posToVal(left, 'x');
                    const pct = (xVal - xMin) / xRange;

                    // Zoom in or out
                    const zoomFactor = e.deltaY < 0 ? factor : 1 / factor;
                    const newRange = xRange * zoomFactor;

                    // Clamp to initial range
                    const clampedRange = Math.min(newRange, initialMax - initialMin);

                    // Calculate new bounds centered on cursor
                    let newMin = xVal - clampedRange * pct;
                    let newMax = xVal + clampedRange * (1 - pct);

                    // Clamp to initial bounds
                    if (newMin < initialMin) {
                        newMin = initialMin;
                        newMax = initialMin + clampedRange;
                    }
                    if (newMax > initialMax) {
                        newMax = initialMax;
                        newMin = initialMax - clampedRange;
                    }

                    u.setScale('x', { min: newMin, max: newMax });
                    onZoom?.(newMin, newMax);
                };

                // Drag to pan
                let dragging = false;
                let dragStartX = 0;
                let dragStartMin = 0;
                let dragStartMax = 0;

                const onMouseDown = (e: MouseEvent) => {
                    if (e.button !== 0) return; // Left click only

                    dragging = true;
                    dragStartX = e.clientX;
                    dragStartMin = u.scales.x.min ?? 0;
                    dragStartMax = u.scales.x.max ?? 1;

                    over.style.cursor = 'grabbing';
                };

                const onMouseMove = (e: MouseEvent) => {
                    if (!dragging) return;

                    const rect = over.getBoundingClientRect();
                    const dx = e.clientX - dragStartX;
                    const xRange = dragStartMax - dragStartMin;
                    const pxRange = rect.width;
                    const shift = (dx / pxRange) * xRange;

                    let newMin = dragStartMin - shift;
                    let newMax = dragStartMax - shift;

                    // Clamp to initial bounds
                    if (newMin < initialMin) {
                        newMin = initialMin;
                        newMax = initialMin + xRange;
                    }
                    if (newMax > initialMax) {
                        newMax = initialMax;
                        newMin = initialMax - xRange;
                    }

                    u.setScale('x', { min: newMin, max: newMax });
                    onZoom?.(newMin, newMax);
                };

                const onMouseUp = () => {
                    dragging = false;
                    over.style.cursor = '';
                };

                // Double-click to reset
                const onDblClick = () => {
                    u.setScale('x', { min: initialMin, max: initialMax });
                    onZoom?.(initialMin, initialMax);
                };

                over.addEventListener('wheel', onWheel, { passive: false });
                over.addEventListener('mousedown', onMouseDown);
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
                over.addEventListener('dblclick', onDblClick);

                // Cleanup stored in u for destroy hook
                (u as any)._zoomCleanup = () => {
                    over.removeEventListener('wheel', onWheel);
                    over.removeEventListener('mousedown', onMouseDown);
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                    over.removeEventListener('dblclick', onDblClick);
                };
            }],
            destroy: [(u: uPlot) => {
                (u as any)._zoomCleanup?.();
            }],
        },
    };
}

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
    const { factor = 0.75, onZoom } = options;

    return {
        hooks: {
            ready: [(u: uPlot) => {
                const over = u.over;
                let rect = over.getBoundingClientRect();

                // Keep rect synced
                const syncRect = () => {
                    rect = over.getBoundingClientRect();
                };

                // Wheel zoom
                const onWheel = (e: WheelEvent) => {
                    e.preventDefault();

                    const xMin = u.scales.x.min!;
                    const xMax = u.scales.x.max!;
                    const xRange = xMax - xMin;

                    // Mouse position relative to canvas
                    const left = e.clientX - rect.left;

                    const xVal = u.posToVal(left, 'x');

                    if (Number.isNaN(xVal)) return;

                    const zoomMult = e.deltaY < 0 ? factor : 1 / factor;
                    const newRange = xRange * zoomMult;

                    const initialMin = (u.scales.x as any)._initialMin ?? u.scales.x.min!;
                    const initialMax = (u.scales.x as any)._initialMax ?? u.scales.x.max!;
                    const maxRange = initialMax - initialMin;

                    if ((u.scales.x as any)._initialMin === undefined) {
                        (u.scales.x as any)._initialMin = initialMin;
                        (u.scales.x as any)._initialMax = initialMax;
                    }

                    let clampedRange = newRange;
                    if (clampedRange > maxRange) clampedRange = maxRange;

                    // Center zoom on cursor
                    const xPct = (xVal - xMin) / xRange;
                    let nextMin = xVal - clampedRange * xPct;
                    let nextMax = xVal + clampedRange * (1 - xPct);

                    // Clamp to bounds
                    if (nextMin < initialMin) {
                        nextMin = initialMin;
                        nextMax = initialMin + clampedRange;
                    }
                    if (nextMax > initialMax) {
                        nextMax = initialMax;
                        nextMin = initialMax - clampedRange;
                    }

                    u.batch(() => {
                        u.setScale('x', { min: nextMin, max: nextMax });
                        onZoom?.(nextMin, nextMax);
                    });
                };

                // Drag to pan
                let isDragging = false;
                let dragged = false;
                let dragStartLeft = 0;
                let dragStartXMin = 0;
                let dragStartXMax = 0;

                const onMouseDown = (e: MouseEvent) => {
                    // Left click only
                    if (e.button !== 0) return;

                    if ((u.scales.x as any)._initialMin === undefined) {
                        (u.scales.x as any)._initialMin = u.scales.x.min;
                        (u.scales.x as any)._initialMax = u.scales.x.max;
                    }

                    isDragging = true;
                    dragged = false;
                    dragStartLeft = e.clientX;
                    dragStartXMin = u.scales.x.min!;
                    dragStartXMax = u.scales.x.max!;

                    // Prevent default to avoid text selection and native drag
                    e.preventDefault();
                };

                const onMouseMove = (e: MouseEvent) => {
                    if (!isDragging) return;
                    e.preventDefault();

                    const dx = e.clientX - dragStartLeft;

                    // Threshold to detect actual drag vs slightly sloppy click
                    if (!dragged && Math.abs(dx) > 3) {
                        dragged = true;
                        over.style.cursor = 'move';
                    }

                    if (!dragged) return;

                    const xRange = dragStartXMax - dragStartXMin;
                    const unitsPerPx = xRange / rect.width;
                    const shift = -dx * unitsPerPx;

                    let nextMin = dragStartXMin + shift;
                    let nextMax = dragStartXMax + shift;

                    const initialMin = (u.scales.x as any)._initialMin;
                    const initialMax = (u.scales.x as any)._initialMax;

                    // Hard clamp to bounds
                    if (nextMin < initialMin) {
                        nextMin = initialMin;
                        nextMax = initialMin + xRange;
                    }
                    if (nextMax > initialMax) {
                        nextMax = initialMax;
                        nextMin = initialMax - xRange;
                    }

                    u.setScale('x', { min: nextMin, max: nextMax });
                    onZoom?.(nextMin, nextMax);
                };

                const onMouseUp = (e: MouseEvent) => {
                    if (isDragging) {
                        isDragging = false;
                        over.style.cursor = '';

                        // If we dragged, we need to prevent default behavior (like click/reset)
                        if (dragged) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }
                };

                // Trap click to prevent reset when dragging
                const onClick = (e: MouseEvent) => {
                    if (dragged) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        dragged = false;
                    }
                };

                // Sync rect on resize
                const resizeObserver = new ResizeObserver(syncRect);
                resizeObserver.observe(over);

                // Listeners
                over.addEventListener('wheel', onWheel, { passive: false });
                over.addEventListener('mousedown', onMouseDown);
                over.addEventListener('click', onClick, true);

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp, true);

                // Store initial bounds for zoom clamping
                const xMin = u.scales.x.min;
                const xMax = u.scales.x.max;
                if (xMin !== undefined && xMax !== undefined) {
                    (u.scales.x as any)._initialMin = xMin;
                    (u.scales.x as any)._initialMax = xMax;
                }

                (u as any)._zoomCleanup = () => {
                    over.removeEventListener('wheel', onWheel);
                    over.removeEventListener('mousedown', onMouseDown);
                    over.removeEventListener('click', onClick, true);
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp, true);
                    resizeObserver.disconnect();
                };
            }],
            destroy: [(u: uPlot) => {
                (u as any)._zoomCleanup?.();
            }]
        }
    };
}

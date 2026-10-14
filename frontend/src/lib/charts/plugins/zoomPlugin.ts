/**
 * Zoom Plugin
 *
 * Provides interactive zoom and pan functionality:
 * - Wheel zoom: Scroll to zoom centered on cursor
 * - Drag zoom: Left-click drag to select horizontal region and zoom
 * - Pan: Middle-click or right-click drag to pan
 * - Reset: Double-click to reset to initial view
 *
 * By default each wheel event zooms by `factor`. With `wheel: 'smooth'` the zoom is sized
 * to how far the wheel moved, so a trackpad's stream of small scrolls (or a pinch, which
 * arrives as Ctrl+wheel) zooms smoothly, and a sideways swipe or Shift+wheel pans.
 *
 * Based on uPlot zoom-wheel.html and zoom-variations.html demos.
 */

import type uPlot from 'uplot';

export interface XRange {
    min: number;
    max: number;
}

export interface ZoomPluginOptions {
    /** Zoom factor (0.9 = zoom in 10%, 1.1 = zoom out 10%) */
    factor?: number;
    /** Callback when zoom/pan changes */
    onZoom?: (min: number, max: number) => void;
    /** How far it can zoom out and pan; the range it opened on by default */
    limits?: () => XRange;
    /** Where a double-click returns to; the range it opened on by default */
    home?: () => XRange;
    /** 'steps' (default): every wheel event zooms by `factor`. 'smooth': zooms as far as the wheel moved, and sideways pans */
    wheel?: 'steps' | 'smooth';
}

/** Pixels a wheel event moves, whether it counts in pixels, lines or pages */
function wheelPixels(e: WheelEvent, delta: number): number {
    if (e.deltaMode === 1) return delta * 33;
    if (e.deltaMode === 2) return delta * 800;
    return delta;
}

export function createZoomPlugin(options: ZoomPluginOptions = {}): uPlot.Plugin {
    const { factor = 0.75, onZoom, limits, home, wheel = 'steps' } = options;

    return {
        hooks: {
            ready: [(u: uPlot) => {
                const over = u.over;
                let rect = over.getBoundingClientRect();

                // Keep rect synced
                const syncRect = () => {
                    rect = over.getBoundingClientRect();
                };

                // Ensure initial bounds are stored
                const ensureInitialBounds = () => {
                    if ((u.scales.x as any)._initialMin === undefined) {
                        (u.scales.x as any)._initialMin = u.scales.x.min;
                        (u.scales.x as any)._initialMax = u.scales.x.max;
                    }
                };

                // State for drag-to-pan (middle/right click)
                let isPanning = false;
                let panDragged = false;
                let panStartLeft = 0;
                let panStartXMin = 0;
                let panStartXMax = 0;

                // State for drag-to-zoom (left click)
                let isZoomSelecting = false;
                let zoomDragged = false;
                let zoomSelectStartX = 0;
                let zoomSelectRect: HTMLDivElement | null = null;

                // Helper to clean up selection rectangle
                const cleanupZoomRect = () => {
                    if (zoomSelectRect) {
                        if (over.contains(zoomSelectRect)) {
                            over.removeChild(zoomSelectRect);
                        }
                        zoomSelectRect = null;
                    }
                };

                // Helper to reset all drag state and cursor
                const resetDragState = () => {
                    if (isZoomSelecting || isPanning) {
                        isZoomSelecting = false;
                        isPanning = false;
                        over.style.cursor = '';
                        cleanupZoomRect();
                    }
                };

                // How far it can zoom out and pan
                const bounds = (): XRange => limits?.() ?? { min: (u.scales.x as any)._initialMin, max: (u.scales.x as any)._initialMax };

                // Moves the view sideways by `px` pixels, within bounds
                const panBy = (px: number) => {
                    const xMin = u.scales.x.min!;
                    const xMax = u.scales.x.max!;
                    const xRange = xMax - xMin;
                    const { min: initialMin, max: initialMax } = bounds();
                    let nextMin = xMin + px * (xRange / rect.width);
                    nextMin = Math.max(initialMin, Math.min(initialMax - xRange, nextMin));
                    u.batch(() => {
                        u.setScale('x', { min: nextMin, max: nextMin + xRange });
                        onZoom?.(nextMin, nextMin + xRange);
                    });
                };

                // Wheel zoom (centered on cursor)
                const onWheel = (e: WheelEvent) => {
                    e.preventDefault();
                    syncRect(); // Ensure fresh coordinates
                    ensureInitialBounds();

                    if (wheel === 'smooth' && !e.ctrlKey && !e.metaKey) {
                        // A sideways swipe or Shift+wheel pans
                        const sideways = e.shiftKey
                            ? e.deltaX || e.deltaY
                            : Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;
                        if (sideways) {
                            panBy(wheelPixels(e, sideways));
                            return;
                        }
                    }

                    const xMin = u.scales.x.min!;
                    const xMax = u.scales.x.max!;
                    const xRange = xMax - xMin;

                    const left = e.clientX - rect.left;
                    const xVal = u.posToVal(left, 'x');

                    if (Number.isNaN(xVal)) return;

                    const zoomMult = wheel === 'smooth'
                        // A trackpad or a pinch sends many small steps where a mouse wheel sends one of about 100 px
                        ? Math.pow(1 / factor, Math.max(-1, Math.min(1, wheelPixels(e, e.deltaY) / 100)))
                        : e.deltaY < 0 ? factor : 1 / factor;
                    const newRange = xRange * zoomMult;

                    const { min: initialMin, max: initialMax } = bounds();
                    const maxRange = initialMax - initialMin;

                    let clampedRange = newRange;
                    if (clampedRange > maxRange) clampedRange = maxRange;

                    const xPct = (xVal - xMin) / xRange;
                    let nextMin = xVal - clampedRange * xPct;
                    let nextMax = xVal + clampedRange * (1 - xPct);

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

                const onMouseDown = (e: MouseEvent) => {
                    syncRect(); // Ensure fresh coordinates
                    ensureInitialBounds();

                    // Left click (button 0): Drag zoom selection
                    if (e.button === 0) {
                        isZoomSelecting = true;
                        zoomDragged = false;
                        zoomSelectStartX = e.clientX;
                        over.style.cursor = 'crosshair';
                        e.preventDefault();
                        return;
                    }

                    // Middle click (button 1) or Right click (button 2): Pan
                    if (e.button === 1 || e.button === 2) {
                        isPanning = true;
                        panDragged = false;
                        panStartLeft = e.clientX;
                        panStartXMin = u.scales.x.min!;
                        panStartXMax = u.scales.x.max!;
                        e.preventDefault();
                        return;
                    }
                };

                const onMouseMove = (e: MouseEvent) => {
                    // Handle zoom selection (left drag)
                    if (isZoomSelecting) {
                        e.preventDefault();
                        const dx = e.clientX - zoomSelectStartX;

                        // Create selection rectangle after threshold
                        if (Math.abs(dx) > 3 && !zoomSelectRect) {
                            zoomDragged = true;
                            zoomSelectRect = document.createElement('div');
                            zoomSelectRect.style.cssText = `
                                position: absolute;
                                top: 0;
                                bottom: 0;
                                background: rgba(100, 150, 255, 0.2);
                                border-left: 1px solid rgba(100, 150, 255, 0.6);
                                border-right: 1px solid rgba(100, 150, 255, 0.6);
                                pointer-events: none;
                                z-index: 100;
                            `;
                            over.appendChild(zoomSelectRect);
                        }

                        // Update selection rectangle position
                        if (zoomSelectRect) {
                            const startRelative = zoomSelectStartX - rect.left;
                            const currentRelative = e.clientX - rect.left;
                            const left = Math.min(startRelative, currentRelative);
                            const width = Math.abs(currentRelative - startRelative);
                            zoomSelectRect.style.left = `${left}px`;
                            zoomSelectRect.style.width = `${width}px`;
                        }
                        return;
                    }

                    // Handle pan (middle/right drag)
                    if (isPanning) {
                        e.preventDefault();
                        const dx = e.clientX - panStartLeft;

                        if (!panDragged && Math.abs(dx) > 3) {
                            panDragged = true;
                            over.style.cursor = 'move';
                        }

                        if (!panDragged) return;

                        const xRange = panStartXMax - panStartXMin;
                        const unitsPerPx = xRange / rect.width;
                        const shift = -dx * unitsPerPx;

                        let nextMin = panStartXMin + shift;
                        let nextMax = panStartXMax + shift;

                        const { min: initialMin, max: initialMax } = bounds();

                        // Hard clamp to bounds
                        if (nextMin < initialMin) {
                            nextMin = initialMin;
                            nextMax = initialMin + xRange;
                        }
                        if (nextMax > initialMax) {
                            nextMax = initialMax;
                            nextMin = initialMax - xRange;
                        }

                        u.batch(() => {
                            u.setScale('x', { min: nextMin, max: nextMax });
                            onZoom?.(nextMin, nextMax);
                        });
                    }
                };

                const onMouseUp = (e: MouseEvent) => {
                    // Handle zoom selection complete
                    if (isZoomSelecting) {
                        isZoomSelecting = false;
                        over.style.cursor = '';

                        if (zoomSelectRect) {
                            const dx = e.clientX - zoomSelectStartX;

                            // Only zoom if selection is meaningful (> 5px)
                            if (Math.abs(dx) > 5) {
                                const startRelative = zoomSelectStartX - rect.left;
                                const endRelative = e.clientX - rect.left;

                                const xVal1 = u.posToVal(Math.min(startRelative, endRelative), 'x');
                                const xVal2 = u.posToVal(Math.max(startRelative, endRelative), 'x');

                                if (!Number.isNaN(xVal1) && !Number.isNaN(xVal2)) {
                                    const { min: initialMin, max: initialMax } = bounds();

                                    // Clamp to initial bounds
                                    const nextMin = Math.max(xVal1, initialMin);
                                    const nextMax = Math.min(xVal2, initialMax);

                                    if (nextMax > nextMin) {
                                        u.batch(() => {
                                            u.setScale('x', { min: nextMin, max: nextMax });
                                            onZoom?.(nextMin, nextMax);
                                        });
                                    }
                                }
                            }

                            cleanupZoomRect();
                        }

                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }

                    // Handle pan complete
                    if (isPanning) {
                        isPanning = false;
                        over.style.cursor = '';

                        if (panDragged) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }
                };

                // Trap click to prevent unwanted behavior after drag operations
                const onClick = (e: MouseEvent) => {
                    if (panDragged || zoomDragged) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        panDragged = false;
                        zoomDragged = false;
                    }
                };

                // Double-click to reset zoom
                const onDoubleClick = (e: MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const target = home?.() ?? { min: (u.scales.x as any)._initialMin, max: (u.scales.x as any)._initialMax };

                    if (target.min !== undefined && target.max !== undefined) {
                        u.batch(() => {
                            u.setScale('x', target);
                            onZoom?.(target.min, target.max);
                        });
                    }
                };

                // Prevent context menu on right-click (we use it for pan)
                const onContextMenu = (e: MouseEvent) => {
                    e.preventDefault();
                };

                // Reset state when mouse leaves chart area during drag
                const onMouseLeave = () => {
                    resetDragState();
                };

                // Sync rect on resize
                const resizeObserver = new ResizeObserver(syncRect);
                resizeObserver.observe(over);

                // Attach event listeners
                over.addEventListener('wheel', onWheel, { passive: false });
                over.addEventListener('mousedown', onMouseDown);
                over.addEventListener('click', onClick, true);
                over.addEventListener('dblclick', onDoubleClick);
                over.addEventListener('contextmenu', onContextMenu);
                over.addEventListener('mouseleave', onMouseLeave);

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp, true);

                // Store initial bounds for zoom clamping
                const xMin = u.scales.x.min;
                const xMax = u.scales.x.max;
                if (xMin !== undefined && xMax !== undefined) {
                    (u.scales.x as any)._initialMin = xMin;
                    (u.scales.x as any)._initialMax = xMax;
                }

                // Cleanup function
                (u as any)._zoomCleanup = () => {
                    over.removeEventListener('wheel', onWheel);
                    over.removeEventListener('mousedown', onMouseDown);
                    over.removeEventListener('click', onClick, true);
                    over.removeEventListener('dblclick', onDoubleClick);
                    over.removeEventListener('contextmenu', onContextMenu);
                    over.removeEventListener('mouseleave', onMouseLeave);
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp, true);
                    resizeObserver.disconnect();
                    cleanupZoomRect();
                };
            }],
            destroy: [(u: uPlot) => {
                (u as any)._zoomCleanup?.();
            }]
        }
    };
}

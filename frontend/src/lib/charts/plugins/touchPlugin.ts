/**
 * Touch Plugin
 *
 * Provides touch gesture support for charts:
 * - Pinch zoom: Two-finger pinch to zoom in/out centered on focal point
 * - Pan: Single-finger drag to pan horizontally
 * - Tap: Single tap to show tooltip, tap elsewhere to hide
 *
 * Works alongside mouse-based zoomPlugin for hybrid desktop/mobile support.
 */

import type uPlot from 'uplot';

export interface TouchPluginOptions {
    /** Callback when zoom/pan changes */
    onZoom?: (min: number, max: number) => void;
}

interface TouchPoint {
    identifier: number;
    clientX: number;
    clientY: number;
}

// Track which chart currently has an active tooltip (for tap-outside clearing)
let activeTooltipChart: uPlot | null = null;

export function createTouchPlugin(options: TouchPluginOptions = {}): uPlot.Plugin {
    const { onZoom } = options;

    return {
        hooks: {
            ready: [(u: uPlot) => {
                const over = u.over;
                let rect = over.getBoundingClientRect();

                const syncRect = () => {
                    rect = over.getBoundingClientRect();
                };

                const ensureInitialBounds = () => {
                    if ((u.scales.x as any)._initialMin === undefined) {
                        (u.scales.x as any)._initialMin = u.scales.x.min;
                        (u.scales.x as any)._initialMax = u.scales.x.max;
                    }
                };

                // Gesture state
                const activeTouches = new Map<number, TouchPoint>();
                let gestureType: 'none' | 'tap' | 'pan' | 'pinch' = 'none';
                let hasMoved = false;

                // Tap state
                let tapStartX = 0;
                let tapStartY = 0;
                let tapStartTime = 0;

                // Pan state
                let panStartX = 0;
                let panStartXMin = 0;
                let panStartXMax = 0;

                // Pinch state
                let pinchInitialDistance = 0;
                let pinchInitialMidpointX = 0;
                let pinchInitialXMin = 0;
                let pinchInitialXMax = 0;

                // Thresholds
                const TAP_THRESHOLD_PX = 8;
                const TAP_TIMEOUT_MS = 300;

                const getTouchDistance = (t1: TouchPoint, t2: TouchPoint): number => {
                    const dx = t2.clientX - t1.clientX;
                    const dy = t2.clientY - t1.clientY;
                    return Math.sqrt(dx * dx + dy * dy);
                };

                const getTouchMidpoint = (t1: TouchPoint, t2: TouchPoint) => ({
                    x: (t1.clientX + t2.clientX) / 2,
                    y: (t1.clientY + t2.clientY) / 2,
                });

                const toPoint = (touch: Touch): TouchPoint => ({
                    identifier: touch.identifier,
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                });

                const resetState = () => {
                    activeTouches.clear();
                    gestureType = 'none';
                    hasMoved = false;
                };

                const onTouchStart = (e: TouchEvent) => {
                    syncRect();
                    ensureInitialBounds();

                    for (let i = 0; i < e.changedTouches.length; i++) {
                        const touch = e.changedTouches[i];
                        activeTouches.set(touch.identifier, toPoint(touch));
                    }

                    const touchCount = activeTouches.size;

                    if (touchCount === 1) {
                        const touch = activeTouches.values().next().value!;
                        gestureType = 'tap';
                        hasMoved = false;
                        tapStartX = touch.clientX;
                        tapStartY = touch.clientY;
                        tapStartTime = Date.now();
                        panStartX = touch.clientX;
                        panStartXMin = u.scales.x.min!;
                        panStartXMax = u.scales.x.max!;
                    } else if (touchCount === 2) {
                        gestureType = 'pinch';
                        hasMoved = false;
                        const touches = Array.from(activeTouches.values());
                        pinchInitialDistance = getTouchDistance(touches[0], touches[1]);
                        pinchInitialMidpointX = getTouchMidpoint(touches[0], touches[1]).x;
                        pinchInitialXMin = u.scales.x.min!;
                        pinchInitialXMax = u.scales.x.max!;
                    } else {
                        gestureType = 'none';
                    }

                    if (gestureType !== 'none') {
                        e.preventDefault();
                    }
                };

                const onTouchMove = (e: TouchEvent) => {
                    if (gestureType === 'none') return;

                    // Update tracked positions
                    for (let i = 0; i < e.changedTouches.length; i++) {
                        const touch = e.changedTouches[i];
                        if (activeTouches.has(touch.identifier)) {
                            activeTouches.set(touch.identifier, toPoint(touch));
                        }
                    }

                    if (gestureType === 'tap' || gestureType === 'pan') {
                        const touch = activeTouches.values().next().value;
                        if (!touch) return;

                        const dx = touch.clientX - tapStartX;
                        const dy = touch.clientY - tapStartY;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist > TAP_THRESHOLD_PX) {
                            hasMoved = true;
                            gestureType = 'pan';
                        }

                        if (gestureType === 'pan' && hasMoved) {
                            const panDx = touch.clientX - panStartX;
                            const xRange = panStartXMax - panStartXMin;
                            const unitsPerPx = xRange / rect.width;
                            const shift = -panDx * unitsPerPx;

                            let nextMin = panStartXMin + shift;
                            let nextMax = panStartXMax + shift;

                            const initialMin = (u.scales.x as any)._initialMin;
                            const initialMax = (u.scales.x as any)._initialMax;

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

                            e.preventDefault();
                        }
                    } else if (gestureType === 'pinch') {
                        const touches = Array.from(activeTouches.values());
                        if (touches.length !== 2) return;

                        hasMoved = true;

                        const currentDistance = getTouchDistance(touches[0], touches[1]);
                        if (currentDistance === 0) return;

                        // Inverted: pinch-in shrinks distance → zoom out, pinch-out → zoom in
                        const scale = pinchInitialDistance / currentDistance;
                        const currentRange = pinchInitialXMax - pinchInitialXMin;
                        let newRange = currentRange * scale;

                        const initialMin = (u.scales.x as any)._initialMin;
                        const initialMax = (u.scales.x as any)._initialMax;
                        const maxRange = initialMax - initialMin;

                        if (newRange > maxRange) newRange = maxRange;
                        if (newRange < maxRange / 50) newRange = maxRange / 50;

                        // Zoom centered on initial pinch midpoint
                        const midRelative = pinchInitialMidpointX - rect.left;
                        const focalXVal = u.posToVal(midRelative, 'x');
                        if (Number.isNaN(focalXVal)) return;

                        const focalPct = (focalXVal - pinchInitialXMin) / currentRange;
                        let nextMin = focalXVal - newRange * focalPct;
                        let nextMax = focalXVal + newRange * (1 - focalPct);

                        if (nextMin < initialMin) {
                            nextMin = initialMin;
                            nextMax = initialMin + newRange;
                        }
                        if (nextMax > initialMax) {
                            nextMax = initialMax;
                            nextMin = initialMax - newRange;
                        }

                        u.batch(() => {
                            u.setScale('x', { min: nextMin, max: nextMax });
                            onZoom?.(nextMin, nextMax);
                        });

                        e.preventDefault();
                    }
                };

                const onTouchEnd = (e: TouchEvent) => {
                    if (gestureType === 'none') {
                        // Remove ended touches even if no gesture
                        for (let i = 0; i < e.changedTouches.length; i++) {
                            activeTouches.delete(e.changedTouches[i].identifier);
                        }
                        return;
                    }

                    // Handle tap → show tooltip
                    if ((gestureType === 'tap') && !hasMoved && activeTouches.size <= e.changedTouches.length) {
                        const tapDuration = Date.now() - tapStartTime;
                        if (tapDuration < TAP_TIMEOUT_MS) {
                            // Clear tooltip on previous chart if different
                            if (activeTooltipChart && activeTooltipChart !== u) {
                                activeTooltipChart.setCursor({ left: -10, top: -10 });
                            }

                            const left = tapStartX - rect.left;
                            const top = tapStartY - rect.top;
                            u.setCursor({ left, top });
                            activeTooltipChart = u;
                        }
                    }

                    // Remove ended touches
                    for (let i = 0; i < e.changedTouches.length; i++) {
                        activeTouches.delete(e.changedTouches[i].identifier);
                    }

                    // Transition from pinch → pan when one finger lifts
                    if (activeTouches.size === 1 && gestureType === 'pinch') {
                        const touch = activeTouches.values().next().value!;
                        gestureType = 'pan';
                        hasMoved = false;
                        tapStartX = touch.clientX;
                        tapStartY = touch.clientY;
                        tapStartTime = Date.now();
                        panStartX = touch.clientX;
                        panStartXMin = u.scales.x.min!;
                        panStartXMax = u.scales.x.max!;
                    } else if (activeTouches.size === 0) {
                        resetState();
                    }

                    e.preventDefault();
                };

                const onTouchCancel = () => {
                    resetState();
                };

                // Resize observer to keep rect fresh
                const resizeObserver = new ResizeObserver(syncRect);
                resizeObserver.observe(over);

                // Set touch-action on the over element to prevent browser gestures
                over.style.touchAction = 'none';

                over.addEventListener('touchstart', onTouchStart, { passive: false });
                over.addEventListener('touchmove', onTouchMove, { passive: false });
                over.addEventListener('touchend', onTouchEnd, { passive: false });
                over.addEventListener('touchcancel', onTouchCancel);

                // Store cleanup
                (u as any)._touchCleanup = () => {
                    over.removeEventListener('touchstart', onTouchStart);
                    over.removeEventListener('touchmove', onTouchMove);
                    over.removeEventListener('touchend', onTouchEnd);
                    over.removeEventListener('touchcancel', onTouchCancel);
                    resizeObserver.disconnect();
                    resetState();
                    if (activeTooltipChart === u) {
                        activeTooltipChart = null;
                    }
                };
            }],
            destroy: [(u: uPlot) => {
                (u as any)._touchCleanup?.();
            }],
        },
    };
}

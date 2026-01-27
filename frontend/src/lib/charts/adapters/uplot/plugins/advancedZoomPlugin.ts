/**
 * Advanced Zoom Plugin for uPlot
 *
 * Provides comprehensive zoom controls including mouse wheel zoom, drag-to-pan,
 * and an optional mini overview chart (range selector) below the main chart.
 *
 * Features:
 * - Mouse wheel zoom centered on cursor position
 * - Drag to pan the visible range
 * - Double-click to reset zoom
 * - Mini overview chart showing full data with selection window
 * - Draggable selection handles on overview
 */

import type { DataZoomConfig, ChartTheme } from '../../../types';
import type uPlot from 'uplot';

/** Zoom factor per wheel step (20% zoom in/out) */
const ZOOM_FACTOR = 0.8;

/** Throttle interval for zoom events (ms) */
const ZOOM_THROTTLE_MS = 16; // ~60fps

/** Height of the range selector overview chart */
const OVERVIEW_HEIGHT = 50;

/** Margin above the overview chart */
const OVERVIEW_MARGIN = 8;

/** Width of the draggable handles on range selector */
const HANDLE_WIDTH = 8;

/** Minimum selection width in pixels */
const MIN_SELECTION_PX = 30;

/** WeakMap to store cleanup functions */
const cleanupMap = new WeakMap<uPlot, () => void>();

/**
 * Create a plugin that enables advanced zoom with optional range selector.
 */
export function advancedZoomPlugin(
    zoomConfig: DataZoomConfig | undefined,
    theme: ChartTheme
): uPlot.Plugin {
    if (!zoomConfig || zoomConfig.enabled === false) {
        return { hooks: {} };
    }

    // State for range selector
    let overviewContainer: HTMLElement | null = null;
    let overviewCanvas: HTMLCanvasElement | null = null;
    let overviewCtx: CanvasRenderingContext2D | null = null;
    let isDraggingOverview = false;
    let overviewDragMode: 'pan' | 'left' | 'right' | null = null;
    let overviewDragStartX = 0;
    let overviewDragStartMin = 0;
    let overviewDragStartMax = 0;

    // Store overview handlers for cleanup
    let overviewMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
    let overviewMouseUpHandler: (() => void) | null = null;

    /**
     * Draw the mini overview chart with selection overlay.
     */
    function drawOverview(u: uPlot) {
        if (!overviewCanvas || !overviewCtx) return;

        const ctx = overviewCtx;
        const width = overviewCanvas.width;
        const height = overviewCanvas.height;
        const padding = 4;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw background
        ctx.fillStyle = theme.cardBg;
        ctx.fillRect(0, 0, width, height);

        // Get data bounds for Y-axis scaling
        let yMin = Infinity;
        let yMax = -Infinity;

        for (let i = 1; i < u.data.length; i++) {
            const series = u.data[i] as (number | null)[];
            if (!series || u.series[i]?.show === false) continue;

            for (const val of series) {
                if (val != null) {
                    yMin = Math.min(yMin, val);
                    yMax = Math.max(yMax, val);
                }
            }
        }

        // Handle edge case where all values are the same
        if (yMin === yMax) {
            yMin -= 1;
            yMax += 1;
        }
        if (!isFinite(yMin) || !isFinite(yMax)) {
            yMin = 0;
            yMax = 1;
        }

        const yRange = yMax - yMin;
        const dataLength = u.data[0]?.length ?? 0;

        // Guard against empty or single-point data (can't draw meaningful overview)
        if (dataLength <= 1) return;

        // Draw simplified line chart for each visible series
        u.series.forEach((s, i) => {
            if (i === 0) return; // Skip x-axis
            if (s.show === false) return;

            const data = u.data[i] as (number | null)[];
            if (!data || data.length === 0) return;

            const color = typeof s.stroke === 'string' ? s.stroke : theme.accent;

            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();

            let started = false;
            for (let idx = 0; idx < data.length; idx++) {
                const val = data[idx];
                if (val == null) {
                    started = false;
                    continue;
                }

                const x = padding + (idx / (dataLength - 1)) * (width - padding * 2);
                const y = height - padding - ((val - yMin) / yRange) * (height - padding * 2);

                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.stroke();
        });

        // Draw selection overlay
        const xScale = u.scales.x;
        const selMin = xScale.min ?? 0;
        const selMax = xScale.max ?? dataLength - 1;

        const selStartPx = padding + (selMin / (dataLength - 1)) * (width - padding * 2);
        const selEndPx = padding + (selMax / (dataLength - 1)) * (width - padding * 2);

        // Dim unselected regions
        ctx.fillStyle = `${theme.background}90`;
        ctx.fillRect(0, 0, selStartPx, height);
        ctx.fillRect(selEndPx, 0, width - selEndPx, height);

        // Draw selection border
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 1;
        ctx.strokeRect(selStartPx, 1, selEndPx - selStartPx, height - 2);

        // Draw handles
        ctx.fillStyle = theme.accent;
        // Left handle
        ctx.fillRect(selStartPx - HANDLE_WIDTH / 2, 0, HANDLE_WIDTH, height);
        // Right handle
        ctx.fillRect(selEndPx - HANDLE_WIDTH / 2, 0, HANDLE_WIDTH, height);

        // Draw handle grips (small lines for visual affordance)
        ctx.strokeStyle = theme.cardBg;
        ctx.lineWidth = 1;
        const gripY1 = height / 2 - 6;
        const gripY2 = height / 2 + 6;

        // Left grip lines
        ctx.beginPath();
        ctx.moveTo(selStartPx - 1, gripY1);
        ctx.lineTo(selStartPx - 1, gripY2);
        ctx.moveTo(selStartPx + 1, gripY1);
        ctx.lineTo(selStartPx + 1, gripY2);
        ctx.stroke();

        // Right grip lines
        ctx.beginPath();
        ctx.moveTo(selEndPx - 1, gripY1);
        ctx.lineTo(selEndPx - 1, gripY2);
        ctx.moveTo(selEndPx + 1, gripY1);
        ctx.lineTo(selEndPx + 1, gripY2);
        ctx.stroke();
    }

    return {
        hooks: {
            init: (u: uPlot) => {
                const canvas = u.over;
                if (!canvas) return;

                // State for main chart zoom/pan
                let isPanning = false;
                let panStartX = 0;
                let panStartScaleMin = 0;
                let panStartScaleMax = 0;
                let lastZoomTime = 0;

                // Wheel zoom handler
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

                    // Ensure min range
                    if (clampedMax - clampedMin >= 2 && clampedMin < clampedMax) {
                        u.setScale('x', { min: clampedMin, max: clampedMax });
                    }
                };

                // Pan start handler
                const handleMouseDown = (e: MouseEvent) => {
                    if (e.button !== 0) return; // Only left button

                    const xScale = u.scales.x;
                    if (xScale.min == null || xScale.max == null) return;

                    isPanning = true;
                    panStartX = e.clientX;
                    panStartScaleMin = xScale.min;
                    panStartScaleMax = xScale.max;

                    canvas.style.cursor = 'grabbing';
                };

                // Pan move handler
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

                    // Final clamp
                    newMin = Math.max(dataMin, newMin);
                    newMax = Math.min(dataMax, newMax);

                    if (newMin < newMax) {
                        u.setScale('x', { min: newMin, max: newMax });
                    }
                };

                // Pan end handler
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

                // Add main chart event listeners
                canvas.addEventListener('wheel', handleWheel, { passive: false });
                canvas.addEventListener('mousedown', handleMouseDown);
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
                canvas.addEventListener('dblclick', handleDblClick);

                // Create range selector (overview chart) if configured
                if (zoomConfig.type === 'slider' || zoomConfig.type === 'both') {
                    // Create container
                    overviewContainer = document.createElement('div');
                    overviewContainer.style.cssText = `
                        position: relative;
                        width: 100%;
                        height: ${OVERVIEW_HEIGHT}px;
                        margin-top: ${OVERVIEW_MARGIN}px;
                        border-radius: 4px;
                        overflow: hidden;
                        cursor: pointer;
                    `;

                    // Create canvas
                    overviewCanvas = document.createElement('canvas');
                    overviewCanvas.style.cssText = `
                        display: block;
                        width: 100%;
                        height: 100%;
                    `;
                    overviewCanvas.width = u.bbox.width;
                    overviewCanvas.height = OVERVIEW_HEIGHT;
                    overviewCtx = overviewCanvas.getContext('2d');
                    overviewContainer.appendChild(overviewCanvas);

                    // Overview mouse handlers
                    const handleOverviewMouseDown = (e: MouseEvent) => {
                        if (!overviewCanvas) return;

                        const rect = overviewCanvas.getBoundingClientRect();
                        const mouseX = e.clientX - rect.left;
                        const dataLength = u.data[0]?.length ?? 1;

                        // Calculate current selection in pixels
                        const xScale = u.scales.x;
                        const padding = 4;
                        const selMin = xScale.min ?? 0;
                        const selMax = xScale.max ?? dataLength - 1;
                        const selStartPx = padding + (selMin / (dataLength - 1)) * (rect.width - padding * 2);
                        const selEndPx = padding + (selMax / (dataLength - 1)) * (rect.width - padding * 2);

                        // Determine drag mode
                        if (Math.abs(mouseX - selStartPx) < HANDLE_WIDTH) {
                            overviewDragMode = 'left';
                        } else if (Math.abs(mouseX - selEndPx) < HANDLE_WIDTH) {
                            overviewDragMode = 'right';
                        } else if (mouseX >= selStartPx && mouseX <= selEndPx) {
                            overviewDragMode = 'pan';
                        } else {
                            // Click outside - jump to position
                            const clickPct = (mouseX - padding) / (rect.width - padding * 2);
                            const clickIdx = Math.max(0, Math.min(dataLength - 1, clickPct * (dataLength - 1)));
                            const currentRange = selMax - selMin;
                            let newMin = clickIdx - currentRange / 2;
                            let newMax = clickIdx + currentRange / 2;

                            // Clamp
                            if (newMin < 0) {
                                newMax -= newMin;
                                newMin = 0;
                            }
                            if (newMax > dataLength - 1) {
                                newMin -= newMax - (dataLength - 1);
                                newMax = dataLength - 1;
                            }

                            u.setScale('x', { min: Math.max(0, newMin), max: Math.min(dataLength - 1, newMax) });
                            return;
                        }

                        isDraggingOverview = true;
                        overviewDragStartX = mouseX;
                        overviewDragStartMin = selMin;
                        overviewDragStartMax = selMax;

                        e.preventDefault();
                    };

                    const handleOverviewMouseMove = (e: MouseEvent) => {
                        if (!isDraggingOverview || !overviewCanvas) return;

                        const rect = overviewCanvas.getBoundingClientRect();
                        const mouseX = e.clientX - rect.left;
                        const dx = mouseX - overviewDragStartX;
                        const dataLength = u.data[0]?.length ?? 1;
                        const padding = 4;
                        const pxPerUnit = (rect.width - padding * 2) / (dataLength - 1);
                        const unitOffset = dx / pxPerUnit;

                        let newMin = overviewDragStartMin;
                        let newMax = overviewDragStartMax;

                        if (overviewDragMode === 'pan') {
                            newMin = overviewDragStartMin + unitOffset;
                            newMax = overviewDragStartMax + unitOffset;

                            // Clamp to bounds
                            if (newMin < 0) {
                                newMax -= newMin;
                                newMin = 0;
                            }
                            if (newMax > dataLength - 1) {
                                newMin -= newMax - (dataLength - 1);
                                newMax = dataLength - 1;
                            }
                        } else if (overviewDragMode === 'left') {
                            newMin = overviewDragStartMin + unitOffset;
                            // Ensure minimum selection width
                            const minWidth = MIN_SELECTION_PX / pxPerUnit;
                            newMin = Math.max(0, Math.min(newMin, overviewDragStartMax - minWidth));
                        } else if (overviewDragMode === 'right') {
                            newMax = overviewDragStartMax + unitOffset;
                            // Ensure minimum selection width
                            const minWidth = MIN_SELECTION_PX / pxPerUnit;
                            newMax = Math.min(dataLength - 1, Math.max(newMax, overviewDragStartMin + minWidth));
                        }

                        // Final clamp
                        newMin = Math.max(0, newMin);
                        newMax = Math.min(dataLength - 1, newMax);

                        if (newMin < newMax) {
                            u.setScale('x', { min: newMin, max: newMax });
                        }
                    };

                    const handleOverviewMouseUp = () => {
                        isDraggingOverview = false;
                        overviewDragMode = null;
                    };

                    // Add overview event listeners
                    overviewCanvas.addEventListener('mousedown', handleOverviewMouseDown);
                    document.addEventListener('mousemove', handleOverviewMouseMove);
                    document.addEventListener('mouseup', handleOverviewMouseUp);

                    // Append to chart
                    u.root.appendChild(overviewContainer);

                    // Initial draw
                    drawOverview(u);
                }

                // Store cleanup function
                const cleanup = () => {
                    canvas.removeEventListener('wheel', handleWheel);
                    canvas.removeEventListener('mousedown', handleMouseDown);
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    canvas.removeEventListener('dblclick', handleDblClick);

                    if (overviewContainer) {
                        overviewContainer.remove();
                        overviewContainer = null;
                        overviewCanvas = null;
                        overviewCtx = null;
                    }
                };
                cleanupMap.set(u, cleanup);
            },

            setSize: (u: uPlot) => {
                // Resize overview canvas
                if (overviewCanvas) {
                    overviewCanvas.width = u.bbox.width;
                    drawOverview(u);
                }
            },

            setScale: (u: uPlot, key: string) => {
                // Redraw overview when x-scale changes
                if (key === 'x' && overviewCanvas) {
                    drawOverview(u);
                }
            },

            destroy: (u: uPlot) => {
                const cleanup = cleanupMap.get(u);
                cleanup?.();
                cleanupMap.delete(u);
            },
        },
    };
}

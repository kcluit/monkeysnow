/**
 * Interactive Overlay Plugin for uPlot
 *
 * Combines tooltip, point snapping, and highlight indicators into a cohesive
 * interactive experience. Displays all series values with visual feedback.
 *
 * Features:
 * - Snap-to-nearest-point cursor behavior
 * - Visual highlight circles on hovered data points
 * - Data-rich tooltip with all series values
 * - Smooth positioning with overflow handling
 */

import type { TooltipConfig, SeriesConfig, ChartTheme, TooltipParams } from '../../../types';
import type uPlot from 'uplot';

/** Maximum distance (px) to snap cursor to nearest data point */
const SNAP_THRESHOLD = 30;

/** Throttle interval for cursor updates (ms) */
const UPDATE_THROTTLE_MS = 16; // ~60fps

/** Size of highlight indicator circle (px) */
const HIGHLIGHT_RADIUS = 5;

/** Size of highlight glow effect (px) */
const HIGHLIGHT_GLOW_RADIUS = 10;

interface HighlightPoint {
    seriesIdx: number;
    dataIdx: number;
    x: number;
    y: number;
    color: string;
    value: number;
}

/**
 * Create a plugin that provides interactive overlay with tooltip, snapping, and highlights.
 */
export function interactiveOverlayPlugin(
    tooltipConfig: TooltipConfig | undefined,
    _seriesConfigs: SeriesConfig[],
    theme: ChartTheme,
    xAxisLabels?: string[]
): uPlot.Plugin {
    if (!tooltipConfig || !tooltipConfig.enabled) {
        return { hooks: {} };
    }

    let tooltipEl: HTMLElement | null = null;
    let currentHighlights: HighlightPoint[] = [];
    let lastUpdateTime = 0;

    /**
     * Find the data index closest to cursor position (snap-to-point).
     */
    function findSnapDataIndex(u: uPlot, cursorLeft: number): number {
        // Get cursor x position in data space
        const cursorIdx = u.posToIdx(cursorLeft);

        // Check surrounding indices for closest match
        const candidateIndices = [
            Math.floor(cursorIdx),
            Math.ceil(cursorIdx),
        ].filter(idx => idx >= 0 && idx < (u.data[0]?.length ?? 0));

        if (candidateIndices.length === 0) return 0;

        // Find closest point in pixel space
        let closestIdx = candidateIndices[0];
        let closestDist = Infinity;

        for (const idx of candidateIndices) {
            const pointX = u.valToPos(idx, 'x', true);
            const dist = Math.abs(pointX - cursorLeft);
            if (dist < closestDist) {
                closestDist = dist;
                closestIdx = idx;
            }
        }

        // Only snap if within threshold
        if (closestDist > SNAP_THRESHOLD) {
            // Return the index anyway, but highlights will show the actual point
            return Math.round(cursorIdx);
        }

        return closestIdx;
    }

    /**
     * Collect highlight points for all visible series at given data index.
     */
    function collectHighlights(u: uPlot, dataIdx: number): HighlightPoint[] {
        const highlights: HighlightPoint[] = [];

        u.series.forEach((s, seriesIdx) => {
            if (seriesIdx === 0) return; // Skip x-axis
            if (s.show === false) return; // Skip hidden series

            const value = u.data[seriesIdx]?.[dataIdx];
            if (value == null) return;

            const scale = s.scale ?? 'y';
            const x = u.valToPos(dataIdx, 'x', true);
            const y = u.valToPos(value as number, scale, true);

            // Get series color
            const color = typeof s.stroke === 'function'
                ? theme.accent
                : (s.stroke as string) ?? theme.accent;

            highlights.push({
                seriesIdx,
                dataIdx,
                x,
                y,
                color,
                value: value as number,
            });
        });

        return highlights;
    }

    /**
     * Draw highlight indicators on the canvas.
     */
    function drawHighlights(u: uPlot) {
        // uPlot redraws the canvas, so we draw in the draw hook
        if (currentHighlights.length === 0) return;

        const ctx = u.ctx;
        const { left, top, width, height } = u.bbox;

        ctx.save();

        for (const { x, y, color } of currentHighlights) {
            // Skip if outside plot area
            if (x < left || x > left + width || y < top || y > top + height) continue;

            // Draw outer glow
            ctx.beginPath();
            ctx.arc(x, y, HIGHLIGHT_GLOW_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = `${color}30`;
            ctx.fill();

            // Draw main circle
            ctx.beginPath();
            ctx.arc(x, y, HIGHLIGHT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            // Draw white border for contrast
            ctx.strokeStyle = theme.cardBg;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Format default tooltip HTML content.
     */
    function formatDefaultTooltip(
        params: TooltipParams[],
        xValue: string
    ): string {
        const rows = params
            .map((p) => {
                const valueStr = p.value != null ? p.value.toFixed(1) : 'N/A';
                return `
                    <div style="display: flex; align-items: center; gap: 8px; padding: 3px 0;">
                        <span style="width: 12px; height: 12px; background: ${p.color}; border-radius: 50%; flex-shrink: 0;"></span>
                        <span style="flex: 1; color: ${theme.textSecondary}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.seriesName}</span>
                        <span style="font-weight: 600; font-variant-numeric: tabular-nums;">${valueStr}</span>
                    </div>
                `;
            })
            .join('');

        return `
            <div style="font-weight: 600; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid ${theme.border}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${xValue}
            </div>
            ${rows}
        `;
    }

    /**
     * Position tooltip with smart overflow handling.
     */
    function positionTooltip(
        u: uPlot,
        snapX: number
    ) {
        if (!tooltipEl) return;

        const tooltipWidth = tooltipEl.offsetWidth;
        const tooltipHeight = tooltipEl.offsetHeight;
        const chartWidth = u.bbox.width + u.bbox.left;
        const chartHeight = u.bbox.height + u.bbox.top;

        // Horizontal positioning - prefer right of cursor, flip if overflow
        let tooltipLeft = snapX + 15;
        if (tooltipLeft + tooltipWidth > chartWidth) {
            tooltipLeft = snapX - tooltipWidth - 15;
        }
        tooltipLeft = Math.max(5, tooltipLeft);

        // Vertical positioning - center vertically with bounds check
        let tooltipTop = u.bbox.top + 10;
        if (tooltipTop + tooltipHeight > chartHeight) {
            tooltipTop = Math.max(5, chartHeight - tooltipHeight - 5);
        }

        tooltipEl.style.left = `${tooltipLeft}px`;
        tooltipEl.style.top = `${tooltipTop}px`;
    }

    return {
        hooks: {
            init: (u: uPlot) => {
                // Create tooltip element
                tooltipEl = document.createElement('div');
                tooltipEl.className = 'uplot-tooltip';
                tooltipEl.style.cssText = `
                    position: absolute;
                    display: none;
                    background: ${theme.cardBg};
                    border: 1px solid ${theme.border};
                    border-radius: 8px;
                    padding: 12px 14px;
                    font-size: 12px;
                    color: ${theme.textPrimary};
                    pointer-events: none;
                    z-index: 1000;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
                    max-width: 320px;
                    min-width: 160px;
                    backdrop-filter: blur(8px);
                    transition: opacity 0.1s ease;
                `;

                u.root.appendChild(tooltipEl);
            },

            setCursor: (u: uPlot) => {
                const now = Date.now();

                // Throttle updates for performance
                if (now - lastUpdateTime < UPDATE_THROTTLE_MS) {
                    return;
                }
                lastUpdateTime = now;

                const { left } = u.cursor;

                // Hide if no valid cursor position
                if (left == null || !tooltipEl) {
                    if (tooltipEl) {
                        tooltipEl.style.display = 'none';
                    }
                    currentHighlights = [];
                    currentDataIdx = null;
                    return;
                }

                // Find snap point
                const dataIdx = findSnapDataIndex(u, left);

                // Collect highlight points
                currentHighlights = collectHighlights(u, dataIdx);

                // Build tooltip params
                const params: TooltipParams[] = currentHighlights.map((h) => {
                    const series = u.series[h.seriesIdx];
                    return {
                        seriesName: typeof series.label === 'string' ? series.label : `Series ${h.seriesIdx}`,
                        value: h.value,
                        color: h.color,
                        axisValue: xAxisLabels?.[dataIdx] ?? String(dataIdx),
                    };
                });

                // Update tooltip
                if (params.length > 0) {
                    const xValue = xAxisLabels?.[dataIdx] ?? String(dataIdx);
                    const content = tooltipConfig.formatter
                        ? tooltipConfig.formatter(params)
                        : formatDefaultTooltip(params, xValue);

                    tooltipEl.innerHTML = content;
                    tooltipEl.style.display = 'block';

                    // Position at snap point
                    const snapX = currentHighlights[0]?.x ?? left;
                    positionTooltip(u, snapX);
                } else {
                    tooltipEl.style.display = 'none';
                }

                // Request redraw to show highlights
                // uPlot will call the draw hook
            },

            draw: (u: uPlot) => {
                // Draw highlight indicators after uPlot draws everything else
                drawHighlights(u);
            },

            destroy: () => {
                tooltipEl?.remove();
                tooltipEl = null;
                currentHighlights = [];
            },
        },
    };
}

/**
 * Smart Labels Plugin for uPlot
 *
 * Renders value labels on data points with intelligent collision detection.
 * Only shows labels when they fit without overlapping other labels.
 *
 * Features:
 * - Bounding box collision detection
 * - Importance-based label prioritization (peaks, valleys, endpoints)
 * - Zoom-aware density adjustment
 * - Edge boundary protection
 */

import type { SeriesConfig, ChartTheme } from '../../../types';
import type uPlot from 'uplot';

/** Padding between labels to prevent visual crowding */
const LABEL_PADDING = 6;

/** Font size for labels */
const LABEL_FONT_SIZE = 10;

/** Vertical offset from data point to label */
const LABEL_Y_OFFSET = 6;

/** Maximum labels per series to prevent performance issues */
const MAX_LABELS_PER_SERIES = 30;

interface LabelBox {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    importance: number;
    dataIdx: number;
}

/**
 * Check if two label boxes overlap (with padding).
 */
function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
    return !(
        a.x + a.width + LABEL_PADDING < b.x ||
        b.x + b.width + LABEL_PADDING < a.x ||
        a.y + a.height + LABEL_PADDING < b.y ||
        b.y + b.height + LABEL_PADDING < a.y
    );
}

/**
 * Calculate importance score for a data point.
 * Higher scores are more important and get priority for label placement.
 */
function calculateImportance(
    idx: number,
    value: number,
    data: (number | null)[],
    startIdx: number,
    endIdx: number
): number {
    let score = 0;

    // Endpoints always get high priority
    if (idx === startIdx || idx === endIdx) {
        score += 100;
    }

    // Check if it's a local peak or valley
    const prevValue = idx > 0 ? data[idx - 1] : null;
    const nextValue = idx < data.length - 1 ? data[idx + 1] : null;

    if (prevValue != null && nextValue != null) {
        const isPeak = value > prevValue && value > nextValue;
        const isValley = value < prevValue && value < nextValue;

        if (isPeak) score += 80;
        if (isValley) score += 60;
    }

    // Significant absolute values get slight boost
    score += Math.min(20, Math.abs(value) / 10);

    // Prefer points at regular intervals for visual rhythm
    const intervalBonus = (idx - startIdx) % 5 === 0 ? 10 : 0;
    score += intervalBonus;

    return score;
}

/**
 * Format value for display as label.
 */
function formatLabelValue(value: number): string {
    if (Math.abs(value) >= 100) {
        return Math.round(value).toString();
    }
    if (Math.abs(value) >= 10) {
        return value.toFixed(1);
    }
    return value.toFixed(1);
}

/**
 * Create a plugin that renders smart data point labels with collision detection.
 */
export function smartLabelsPlugin(
    seriesConfigs: SeriesConfig[],
    theme: ChartTheme
): uPlot.Plugin {
    // Check if any series has labels enabled
    const hasLabels = seriesConfigs.some((s) => s.showLabels === true);

    if (!hasLabels) {
        return { hooks: {} };
    }

    return {
        hooks: {
            draw: (u: uPlot) => {
                const ctx = u.ctx;
                const { left, top, width, height } = u.bbox;

                // Track all placed labels to detect collisions across series
                const placedLabels: LabelBox[] = [];

                // Setup text rendering
                ctx.save();
                ctx.font = `bold ${LABEL_FONT_SIZE}px system-ui, -apple-system, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                u.series.forEach((s, seriesIdx) => {
                    if (seriesIdx === 0) return; // Skip x-axis
                    if (s.show === false) return; // Skip hidden series

                    const seriesConfig = seriesConfigs[seriesIdx - 1];
                    if (!seriesConfig || seriesConfig.showLabels !== true) return;

                    // Validate data exists
                    if (!u.data || !u.data[0] || !u.data[seriesIdx]) return;

                    const data = u.data[seriesIdx] as (number | null)[];
                    const xData = u.data[0] as number[];
                    const scale = s.scale ?? 'y';

                    // Get visible range from x-scale
                    const xScale = u.scales.x;
                    if (xScale.min == null || xScale.max == null) return;

                    const startIdx = Math.max(0, Math.floor(xScale.min));
                    const endIdx = Math.min(data.length - 1, Math.ceil(xScale.max));

                    // Collect candidate labels with their bounding boxes
                    const candidates: LabelBox[] = [];

                    for (let idx = startIdx; idx <= endIdx; idx++) {
                        const value = data[idx];
                        if (value == null) continue;

                        const x = u.valToPos(xData[idx], 'x', true);
                        const y = u.valToPos(value, scale, true);

                        // Skip if point is outside visible plot area
                        if (x < left || x > left + width) continue;
                        if (y < top || y > top + height) continue;

                        const text = formatLabelValue(value);
                        const metrics = ctx.measureText(text);
                        const labelWidth = metrics.width;
                        const labelHeight = LABEL_FONT_SIZE;

                        // Calculate label position (centered above point)
                        const labelX = x - labelWidth / 2;
                        let labelY = y - LABEL_Y_OFFSET - labelHeight;

                        // Adjust if label would go above plot area
                        if (labelY < top) {
                            labelY = y + LABEL_Y_OFFSET; // Place below point instead
                        }

                        const importance = calculateImportance(
                            idx,
                            value,
                            data,
                            startIdx,
                            endIdx
                        );

                        candidates.push({
                            x: labelX,
                            y: labelY,
                            width: labelWidth,
                            height: labelHeight,
                            text,
                            importance,
                            dataIdx: idx,
                        });
                    }

                    // Sort by importance (highest first)
                    candidates.sort((a, b) => b.importance - a.importance);

                    // Greedily place labels that don't collide
                    let placedCount = 0;

                    for (const candidate of candidates) {
                        if (placedCount >= MAX_LABELS_PER_SERIES) break;

                        // Check collision with all already-placed labels
                        const hasCollision = placedLabels.some((placed) =>
                            boxesOverlap(candidate, placed)
                        );

                        if (!hasCollision) {
                            // Draw the label
                            ctx.fillStyle = theme.textPrimary;
                            ctx.fillText(
                                candidate.text,
                                candidate.x + candidate.width / 2,
                                candidate.y + candidate.height
                            );

                            // Mark as placed
                            placedLabels.push(candidate);
                            placedCount++;
                        }
                    }
                });

                ctx.restore();
            },
        },
    };
}

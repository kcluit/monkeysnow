/**
 * Chart Registry
 *
 * Global registry for managing chart instances completely outside of React.
 * Charts are identified by a unique ID stored in a data attribute on their container.
 */

import { ChartManager } from './ChartManager';
import type { ChartConfig } from './types';

// Global chart registry
const charts = new Map<string, ChartManager>();

// Counter for generating unique IDs
let nextId = 1;

// ============================================
// Zoom Sync Event Bus
// ============================================

// Global sync state
let globalZoomSyncEnabled = true;
const chartSyncExclusions = new Set<string>();

// Zoom event bus
type ZoomListener = (min: number, max: number, sourceChartId: string) => void;
const zoomListeners = new Set<ZoomListener>();

/**
 * Broadcast zoom change to all listening charts.
 */
export function broadcastZoomChange(min: number, max: number, sourceChartId: string): void {
    if (!globalZoomSyncEnabled) return;
    if (chartSyncExclusions.has(sourceChartId)) return;

    zoomListeners.forEach(listener => {
        listener(min, max, sourceChartId);
    });
}

/**
 * Subscribe to zoom changes from other charts.
 * Returns unsubscribe function.
 */
export function subscribeToZoomChanges(listener: ZoomListener): () => void {
    zoomListeners.add(listener);
    return () => zoomListeners.delete(listener);
}

/**
 * Enable or disable global zoom sync.
 */
export function setGlobalZoomSync(enabled: boolean): void {
    if (globalZoomSyncEnabled && !enabled) {
        charts.forEach((_, chartId) => keepSyncedHeldLine(chartId));
    }
    globalZoomSyncEnabled = enabled;
    notifyHeldLineListeners();
}

/**
 * Check if global zoom sync is enabled.
 */
export function isGlobalZoomSyncEnabled(): boolean {
    return globalZoomSyncEnabled;
}

/**
 * Set whether a specific chart is excluded from zoom sync.
 */
export function setChartZoomSyncExclusion(chartId: string, excluded: boolean): void {
    if (excluded) {
        keepSyncedHeldLine(chartId);
        chartSyncExclusions.add(chartId);
    } else {
        chartSyncExclusions.delete(chartId);
    }
    notifyHeldLineListeners();
}

/**
 * Check if a specific chart is excluded from zoom sync.
 */
export function isChartZoomSyncExcluded(chartId: string): boolean {
    return chartSyncExclusions.has(chartId);
}

/**
 * Check if a chart should participate in zoom sync.
 */
export function isChartZoomSyncEnabled(chartId: string): boolean {
    return globalZoomSyncEnabled && !chartSyncExclusions.has(chartId);
}

// ============================================
// Held lines
// ============================================

// Kept here rather than in the charts, so a chart rebuilt for the same key keeps its Held line.
// Charts in zoom sync share one; a chart out of it has its own.
let syncedHeldLine: string | null = null;
const ownHeldLines = new Map<string, string>();
const heldLineListeners = new Set<() => void>();

function notifyHeldLineListeners(): void {
    heldLineListeners.forEach(listener => listener());
}

/** A chart leaving zoom sync keeps the Held line it was showing. */
function keepSyncedHeldLine(chartId: string): void {
    if (!isChartZoomSyncEnabled(chartId)) return;
    if (syncedHeldLine === null) {
        ownHeldLines.delete(chartId);
    } else {
        ownHeldLines.set(chartId, syncedHeldLine);
    }
}

/**
 * Get a chart's Held line, if any.
 */
export function getHeldLine(chartId: string): string | null {
    return isChartZoomSyncEnabled(chartId)
        ? syncedHeldLine
        : ownHeldLines.get(chartId) ?? null;
}

/**
 * Hold a line on a chart, and on every chart in zoom sync with it; null releases it.
 */
export function setHeldLine(chartId: string, line: string | null): void {
    if (isChartZoomSyncEnabled(chartId)) {
        syncedHeldLine = line;
    } else if (line === null) {
        ownHeldLines.delete(chartId);
    } else {
        ownHeldLines.set(chartId, line);
    }
    notifyHeldLineListeners();
}

/**
 * Release every chart's Held line, for a place whose Comparison models may differ.
 */
export function clearHeldLines(): void {
    syncedHeldLine = null;
    ownHeldLines.clear();
    notifyHeldLineListeners();
}

/**
 * Subscribe to changes of any chart's Held line, or of which charts share one.
 * Returns unsubscribe function.
 */
export function subscribeToHeldLines(listener: () => void): () => void {
    heldLineListeners.add(listener);
    return () => heldLineListeners.delete(listener);
}

/**
 * Generate a unique chart ID.
 */
export function generateChartId(): string {
    return `chart-${nextId++}`;
}

/**
 * Get or create a chart for a container element.
 * Uses data-chart-id attribute to track the chart.
 * @param container - The container element
 * @param chartKey - Optional stable key for this chart (used for zoom sync exclusions)
 */
export function getOrCreateChart(container: HTMLElement, chartKey?: string): ChartManager {
    // Check if container already has a chart
    let chartId = container.dataset.chartId;

    if (chartId && charts.has(chartId)) {
        return charts.get(chartId)!;
    }

    // Create new chart - use chartKey if provided, otherwise generate
    chartId = chartKey || generateChartId();
    container.dataset.chartId = chartId;

    const manager = new ChartManager(container, chartId);
    charts.set(chartId, manager);

    return manager;
}

/**
 * Update a chart's config.
 */
export function updateChart(container: HTMLElement, config: ChartConfig): void {
    const chartId = container.dataset.chartId;
    if (!chartId) {
        console.warn('[chartRegistry] No chart found for container');
        return;
    }

    const manager = charts.get(chartId);
    if (!manager) {
        console.warn(`[chartRegistry] Chart ${chartId} not found in registry`);
        return;
    }

    manager.setConfig(config);
}

/**
 * Destroy a chart and remove it from the registry.
 * Its zoom sync exclusion stays: that is the visitor's setting for the chart key,
 * which a chart rebuilt for the same key (e.g. after a refetch) must keep.
 */
export function destroyChart(container: HTMLElement): void {
    const chartId = container.dataset.chartId;
    if (!chartId) return;

    const manager = charts.get(chartId);
    if (manager) {
        manager.destroy();
        charts.delete(chartId);
    }

    delete container.dataset.chartId;
}

/**
 * Get a chart manager by container element.
 */
export function getChart(container: HTMLElement): ChartManager | undefined {
    const chartId = container.dataset.chartId;
    if (!chartId) return undefined;
    return charts.get(chartId);
}

/**
 * Check if a container has an active chart.
 */
export function hasChart(container: HTMLElement): boolean {
    const chartId = container.dataset.chartId;
    return chartId !== undefined && charts.has(chartId);
}

/**
 * Debug: get all active charts.
 */
export function getActiveCharts(): Map<string, ChartManager> {
    return new Map(charts);
}

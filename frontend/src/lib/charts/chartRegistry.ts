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
    globalZoomSyncEnabled = enabled;
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
        chartSyncExclusions.add(chartId);
    } else {
        chartSyncExclusions.delete(chartId);
    }
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

/**
 * Generate a unique chart ID.
 */
export function generateChartId(): string {
    return `chart-${nextId++}`;
}

/**
 * Get or create a chart for a container element.
 * Uses data-chart-id attribute to track the chart.
 */
export function getOrCreateChart(container: HTMLElement): ChartManager {
    // Check if container already has a chart
    let chartId = container.dataset.chartId;

    if (chartId && charts.has(chartId)) {
        return charts.get(chartId)!;
    }

    // Create new chart
    chartId = generateChartId();
    container.dataset.chartId = chartId;

    const manager = new ChartManager(container, chartId);
    charts.set(chartId, manager);

    console.log(`[chartRegistry] Created chart ${chartId}`);

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
 */
export function destroyChart(container: HTMLElement): void {
    const chartId = container.dataset.chartId;
    if (!chartId) return;

    const manager = charts.get(chartId);
    if (manager) {
        manager.destroy();
        charts.delete(chartId);
        console.log(`[chartRegistry] Destroyed chart ${chartId}`);
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

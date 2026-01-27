/**
 * Sync Plugin
 *
 * Synchronizes zoom/pan across multiple charts using a shared key.
 * Charts with the same syncKey will have synchronized X-axis scales.
 */

import type uPlot from 'uplot';

/** Global registry of charts by syncKey */
const syncRegistry = new Map<string, Set<uPlot>>();

/** Flag to prevent infinite sync loops */
let isSyncing = false;

export interface SyncPluginOptions {
    /** Unique key to group charts for synchronization */
    syncKey: string;
}

export function createSyncPlugin(options: SyncPluginOptions): uPlot.Plugin {
    const { syncKey } = options;

    function register(u: uPlot) {
        if (!syncRegistry.has(syncKey)) {
            syncRegistry.set(syncKey, new Set());
        }
        syncRegistry.get(syncKey)!.add(u);
    }

    function unregister(u: uPlot) {
        const group = syncRegistry.get(syncKey);
        if (group) {
            group.delete(u);
            if (group.size === 0) {
                syncRegistry.delete(syncKey);
            }
        }
    }

    function syncOthers(u: uPlot) {
        if (isSyncing) return;

        const group = syncRegistry.get(syncKey);
        if (!group || group.size <= 1) return;

        const xMin = u.scales.x.min;
        const xMax = u.scales.x.max;

        if (xMin === undefined || xMax === undefined) return;

        isSyncing = true;

        for (const other of group) {
            if (other === u) continue;

            const otherMin = other.scales.x.min;
            const otherMax = other.scales.x.max;

            // Only update if different
            if (otherMin !== xMin || otherMax !== xMax) {
                other.setScale('x', { min: xMin, max: xMax });
            }
        }

        isSyncing = false;
    }

    return {
        hooks: {
            init: [register],
            setScale: [
                (u: uPlot, key: string) => {
                    if (key === 'x') {
                        syncOthers(u);
                    }
                },
            ],
            destroy: [unregister],
        },
    };
}

/**
 * Manually sync all charts with a given key to specified scale.
 * Useful for programmatic sync control.
 */
export function syncAllCharts(syncKey: string, min: number, max: number): void {
    const group = syncRegistry.get(syncKey);
    if (!group) return;

    isSyncing = true;

    for (const chart of group) {
        chart.setScale('x', { min, max });
    }

    isSyncing = false;
}

/**
 * Reset all charts with a given key to their initial scale.
 */
export function resetAllCharts(syncKey: string): void {
    const group = syncRegistry.get(syncKey);
    if (!group) return;

    isSyncing = true;

    for (const chart of group) {
        // Get data range
        const xData = chart.data[0];
        if (xData && xData.length > 0) {
            const min = xData[0] as number;
            const max = xData[xData.length - 1] as number;
            chart.setScale('x', { min, max });
        }
    }

    isSyncing = false;
}

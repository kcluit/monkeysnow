/**
 * Chart Manager
 *
 * Vanilla JS class that manages uPlot lifecycle independently of React.
 * Handles chart creation, updates, zoom state preservation, and destruction.
 */

import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { ChartConfig } from './types';
import { createZoomPlugin, createBandFillPlugin, createBoxWhiskerPlugin, createHeatmapPlugin, createWindArrowPlugin } from './plugins';
import { colorWithOpacity } from './utils/colorUtils';
import {
    subscribeToZoomChanges,
    broadcastZoomChange,
    isChartZoomSyncEnabled,
} from './chartRegistry';

/**
 * Generate a structural key for comparison.
 * Only changes to structural properties should trigger a chart rebuild.
 */
function getStructuralKey(config: ChartConfig): string {
    return JSON.stringify({
        type: config.type,
        xAxisType: config.xAxis.type,
        seriesIds: config.series.map(s => s.id),
        seriesTypes: config.series.map(s => s.type),
        seriesColors: config.series.map(s => s.color),
        seriesYAxisIndex: config.series.map(s => s.yAxisIndex ?? 0),
        hasBandData: config.series.map(s => !!s.bandData),
        hasSecondaryAxis: !!config.yAxisSecondary,
        dataZoomEnabled: config.dataZoom?.enabled ?? false,
        height: config.height,
        // Theme affects colors
        themeAccent: config.theme.accent,
        themeBackground: config.theme.background,
    });
}

/**
 * Transform ChartConfig series to uPlot columnar data format.
 */
function transformToUPlotData(config: ChartConfig): uPlot.AlignedData {
    const { xAxis, series } = config;
    const expectedLength = xAxis.data.length;
    const xData = xAxis.data.map((_, idx) => idx);

    const yData = series.map((s) => {
        // Ensure series data matches x-axis length
        const data = s.data.slice(0, expectedLength);

        // Pad with nulls if series is shorter
        while (data.length < expectedLength) {
            data.push(null);
        }

        // Convert values, ensuring nulls and NaN become null
        return data.map((v) => {
            if (v === null || v === undefined || !Number.isFinite(v)) {
                return null;
            }
            return v;
        });
    });

    return [xData, ...yData] as uPlot.AlignedData;
}

/**
 * Build uPlot series configuration from ChartConfig.
 * Handles different chart types: line, area, bar, boxwhisker, heatmap.
 */
function buildUPlotSeries(config: ChartConfig): uPlot.Series[] {
    const { series } = config;
    const uplotSeries: uPlot.Series[] = [{}];

    // Create bar paths builder if any series needs it (lazy initialization)
    const needsBarPaths = series.some(s => s.type === 'bar');
    const barPaths = needsBarPaths && uPlot.paths.bars ? uPlot.paths.bars({
        size: [0.6, 100], // 60% of available space, max 100px
        radius: 0.1,      // Slightly rounded corners
        gap: 2,           // 2px gap between bars
    }) : null;

    for (const s of series) {
        const stroke = s.color;
        const opacity = s.opacity ?? 1;

        // Determine paths based on series type
        let paths: uPlot.Series.PathBuilder | undefined;
        let fill: string | undefined;

        switch (s.type) {
            case 'bar':
                // Use bar paths renderer if available
                if (barPaths) {
                    paths = barPaths;
                }
                fill = colorWithOpacity(s.color, opacity);
                break;

            case 'boxwhisker':
            case 'heatmap':
                // These are rendered by plugins, hide the default series line
                paths = () => null;
                break;

            case 'area':
                // Area charts use default line paths with fill
                const fillOpacity = s.fillOpacity ?? 0.3;
                fill = colorWithOpacity(s.color, fillOpacity * opacity);
                break;

            case 'band':
                // Band series are handled by plugin, hide default rendering
                paths = () => null;
                break;

            // 'line' type uses default paths (undefined)
        }

        let dash: number[] | undefined;
        if (s.lineStyle === 'dashed') {
            dash = [6, 4];
        } else if (s.lineStyle === 'dotted') {
            dash = [2, 2];
        }

        const seriesConfig: uPlot.Series = {
            label: s.name,
            stroke: colorWithOpacity(stroke, opacity),
            fill,
            width: s.lineWidth ?? 2,
            dash,
            points: { show: false },
            spanGaps: false,
            show: true,
            scale: s.yAxisIndex === 1 ? 'y2' : 'y',
        };

        // Only set paths if we have a custom renderer
        if (paths !== undefined) {
            seriesConfig.paths = paths;
        }

        uplotSeries.push(seriesConfig);
    }

    return uplotSeries;
}

/**
 * Build uPlot axes configuration.
 */
function buildUPlotAxes(config: ChartConfig): uPlot.Axis[] {
    const { xAxis, yAxis, yAxisSecondary, theme } = config;

    const axes: uPlot.Axis[] = [
        {
            scale: 'x',
            stroke: theme.textSecondary,
            grid: { show: true, stroke: theme.gridColor, width: 1 },
            ticks: { show: true, stroke: theme.gridColor, size: 5 },
            border: { show: true, stroke: theme.textSecondary, width: 2 },
            values: (_u, vals) =>
                vals.map((v) => {
                    const idx = Math.round(v);
                    // Ensure index is within bounds
                    if (idx < 0 || idx >= xAxis.data.length) {
                        return '';
                    }
                    return xAxis.data[idx] || '';
                }),
            gap: 8,
            size: 40,
            font: '11px system-ui, -apple-system, sans-serif',
        },
        {
            stroke: theme.textSecondary,
            grid: { show: true, stroke: theme.gridColor, width: 1 },
            ticks: { show: true, stroke: theme.gridColor, size: 5 },
            border: { show: true, stroke: theme.textSecondary, width: 2 },
            values: (_u, vals) => vals.map((v) => yAxis.formatter(v)),
            gap: 8,
            size: 50,
            font: '11px system-ui, -apple-system, sans-serif',
            scale: 'y',
        },
    ];

    if (yAxisSecondary) {
        axes.push({
            stroke: theme.textSecondary,
            grid: { show: false },
            ticks: { show: true, stroke: theme.gridColor, size: 5 },
            values: (_u, vals) => vals.map((v) => yAxisSecondary.formatter(v)),
            gap: 8,
            size: 50,
            font: '11px system-ui, -apple-system, sans-serif',
            side: 1,
            scale: 'y2',
        });
    }

    return axes;
}

/**
 * Build uPlot scales configuration.
 */
function buildUPlotScales(config: ChartConfig): uPlot.Scales {
    const { yAxis, yAxisSecondary } = config;

    const scales: uPlot.Scales = {
        x: { time: false },
        y: {
            auto: true,
            // Ensure valid range even when data is empty or all nulls
            range: (_u: uPlot, dataMin: number, dataMax: number) => {
                // Handle invalid data ranges (Infinity occurs when no valid data)
                if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax)) {
                    return [0, 100]; // Fallback range
                }
                // Ensure min < max (add padding if equal)
                if (dataMin === dataMax) {
                    const padding = Math.abs(dataMin) * 0.1 || 1;
                    return [dataMin - padding, dataMax + padding];
                }
                return [dataMin, dataMax];
            },
        },
    };

    if (yAxis.domain) {
        const [min, max] = yAxis.domain;
        if (min !== 'auto' && max !== 'auto') {
            scales.y = { auto: false, range: [min, max] };
        } else if (min !== 'auto') {
            scales.y = {
                auto: true,
                range: (_u: uPlot, _dataMin: number, dataMax: number) => {
                    // Handle invalid dataMax
                    const validMax = Number.isFinite(dataMax) ? dataMax : min + 100;
                    // Ensure min < max
                    return [min, Math.max(validMax, min + 1)];
                },
            };
        } else if (max !== 'auto') {
            scales.y = {
                auto: true,
                range: (_u: uPlot, dataMin: number, _dataMax: number) => {
                    // Handle invalid dataMin
                    const validMin = Number.isFinite(dataMin) ? dataMin : max - 100;
                    // Ensure min < max
                    return [Math.min(validMin, max - 1), max];
                },
            };
        }
    }

    if (yAxisSecondary) {
        scales.y2 = {
            auto: true,
            range: (_u: uPlot, dataMin: number, dataMax: number) => {
                if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax)) {
                    return [0, 100];
                }
                if (dataMin === dataMax) {
                    const padding = Math.abs(dataMin) * 0.1 || 1;
                    return [dataMin - padding, dataMax + padding];
                }
                return [dataMin, dataMax];
            },
        };
    }

    return scales;
}

/**
 * ChartManager - Manages uPlot lifecycle independently of React
 */
export class ChartManager {
    private container: HTMLElement;
    private chart: uPlot | null = null;
    private currentConfig: ChartConfig | null = null;
    private structuralKey: string = '';
    private resizeObserver: ResizeObserver | null = null;
    private isDestroyed: boolean = false;

    // Zoom sync
    private chartId: string;
    private unsubscribeZoom: (() => void) | null = null;
    private isApplyingExternalZoom: boolean = false;

    constructor(container: HTMLElement, chartId: string) {
        this.container = container;
        this.chartId = chartId;

        // Subscribe to zoom changes from other charts
        this.unsubscribeZoom = subscribeToZoomChanges((min, max, sourceChartId) => {
            if (sourceChartId !== this.chartId &&
                isChartZoomSyncEnabled(this.chartId) &&
                !this.isApplyingExternalZoom) {
                this.applyExternalZoom(min, max);
            }
        });

        // Set up resize observer
        this.resizeObserver = new ResizeObserver(() => {
            this.handleResize();
        });
        this.resizeObserver.observe(container);
    }

    /**
     * Update the chart with a new config.
     * Decides whether to rebuild or just update data based on structural changes.
     */
    setConfig(config: ChartConfig): void {
        if (this.isDestroyed) {
            console.warn('[ChartManager] Cannot setConfig on destroyed manager');
            return;
        }

        const newStructuralKey = getStructuralKey(config);
        const isStructuralChange = newStructuralKey !== this.structuralKey;

        if (isStructuralChange) {
            console.log('[ChartManager] Structural change - rebuilding chart');
            this.rebuildChart(config, newStructuralKey);
        } else if (this.chart) {
            // Data-only change - use setData with resetScales=false to preserve zoom
            const data = transformToUPlotData(config);
            this.chart.setData(data, false);
        }

        this.currentConfig = config;
    }

    /**
     * Rebuild the chart from scratch.
     */
    private rebuildChart(config: ChartConfig, newStructuralKey: string): void {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        this.structuralKey = newStructuralKey;
        this.createChart(config);
    }

    /**
     * Create a new uPlot instance.
     */
    private createChart(config: ChartConfig): void {
        const width = this.container.offsetWidth;
        if (width === 0) {
            // Container not ready yet, wait for resize
            console.log('[ChartManager] Container width is 0, waiting for resize');
            return;
        }

        // Validate we have data to display
        if (config.xAxis.data.length === 0 || config.series.length === 0) {
            console.log('[ChartManager] No data to display, skipping chart creation');
            return;
        }

        const { dataZoom, series } = config;

        // Build plugins
        const plugins: uPlot.Plugin[] = [];

        if (dataZoom?.enabled) {
            plugins.push(createZoomPlugin({
                onZoom: (min, max) => {
                    if (isChartZoomSyncEnabled(this.chartId)) {
                        broadcastZoomChange(min, max, this.chartId);
                    }
                }
            }));
        }

        const bandSeries = series.filter((s) => s.type === 'band' && s.bandData);
        if (bandSeries.length > 0) {
            plugins.push(createBandFillPlugin({ series: bandSeries }));
        }

        // Box & whisker plugin - draws ensemble spread visualization
        const boxWhiskerSeries = series.filter((s) => s.type === 'boxwhisker' && s.boxWhiskerData);
        if (boxWhiskerSeries.length > 0) {
            plugins.push(createBoxWhiskerPlugin({ series: boxWhiskerSeries }));
        }

        // Heatmap plugin - draws hour-of-day matrix visualization
        const heatmapSeries = series.find((s) => s.type === 'heatmap' && s.heatmapData);
        if (heatmapSeries && heatmapSeries.heatmapData) {
            const allValues = heatmapSeries.heatmapData.values.flat().filter((v): v is number => v !== null && Number.isFinite(v));
            if (allValues.length > 0) {
                const valueRange: [number, number] = [Math.min(...allValues), Math.max(...allValues)];
                plugins.push(createHeatmapPlugin({ series: heatmapSeries, valueRange, theme: config.theme }));
            }
        }

        // Wind arrow plugin - draws directional arrows on wind speed charts
        const windArrowSeries = series.find((s) => s.windArrowData);
        if (windArrowSeries) {
            plugins.push(createWindArrowPlugin({ series: windArrowSeries }));
        }

        // Build uPlot options
        const opts: uPlot.Options = {
            width,
            height: config.height,
            series: buildUPlotSeries(config),
            axes: buildUPlotAxes(config),
            scales: buildUPlotScales(config),
            plugins,
            cursor: {
                drag: { x: false, y: false },
                focus: { prox: 30 },
            },
            legend: { show: true },
            padding: [
                config.grid.top,
                config.grid.right,
                config.grid.bottom,
                config.grid.left,
            ],
        };

        // Create chart
        const data = transformToUPlotData(config);
        this.chart = new uPlot(opts, data, this.container);

        console.log('[ChartManager] Chart created', {
            width,
            height: config.height,
            seriesCount: series.length,
        });
    }

    /**
     * Handle container resize.
     */
    private handleResize(): void {
        if (this.isDestroyed || !this.container) return;

        const width = this.container.offsetWidth;

        if (this.chart) {
            // Just resize existing chart
            this.chart.setSize({
                width,
                height: this.currentConfig?.height ?? 380,
            });
        } else if (this.currentConfig && width > 0) {
            // Chart hasn't been created yet (container wasn't ready), create now
            this.createChart(this.currentConfig);
        }
    }

    /**
     * Apply zoom from another chart (sync) without re-broadcasting.
     */
    private applyExternalZoom(min: number, max: number): void {
        if (!this.chart || this.isDestroyed) return;

        this.isApplyingExternalZoom = true;
        try {
            this.chart.batch(() => {
                this.chart!.setScale('x', { min, max });
            });
        } finally {
            this.isApplyingExternalZoom = false;
        }
    }

    /**
     * Get the chart ID.
     */
    getChartId(): string {
        return this.chartId;
    }

    /**
     * Destroy the chart and clean up resources.
     */
    destroy(): void {
        if (this.isDestroyed) return;

        console.log('[ChartManager] Destroying');

        this.isDestroyed = true;

        // Unsubscribe from zoom events
        if (this.unsubscribeZoom) {
            this.unsubscribeZoom();
            this.unsubscribeZoom = null;
        }

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        this.currentConfig = null;
    }
}

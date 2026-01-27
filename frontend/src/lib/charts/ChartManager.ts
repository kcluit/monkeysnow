/**
 * Chart Manager
 *
 * Vanilla JS class that manages uPlot lifecycle independently of React.
 * Handles chart creation, updates, zoom state preservation, and destruction.
 */

import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { ChartConfig } from './types';
import { createZoomPlugin, createBandFillPlugin } from './plugins';
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
    const xData = xAxis.data.map((_, idx) => idx);
    const yData = series.map((s) => s.data.map((v) => (v === null ? null : v)));
    return [xData, ...yData] as uPlot.AlignedData;
}

/**
 * Build uPlot series configuration from ChartConfig.
 */
function buildUPlotSeries(config: ChartConfig): uPlot.Series[] {
    const { series } = config;
    const uplotSeries: uPlot.Series[] = [{}];

    for (const s of series) {
        const stroke = s.color;
        const opacity = s.opacity ?? 1;

        let fill: string | undefined;
        if (s.type === 'area') {
            const fillOpacity = s.fillOpacity ?? 0.3;
            fill = colorWithOpacity(s.color, fillOpacity * opacity);
        }

        let dash: number[] | undefined;
        if (s.lineStyle === 'dashed') {
            dash = [6, 4];
        } else if (s.lineStyle === 'dotted') {
            dash = [2, 2];
        }

        uplotSeries.push({
            label: s.name,
            stroke: colorWithOpacity(stroke, opacity),
            fill,
            width: s.lineWidth ?? 2,
            dash,
            points: { show: false },
            spanGaps: false,
            show: true,
            scale: s.yAxisIndex === 1 ? 'y2' : 'y',
        });
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
            stroke: theme.textSecondary,
            grid: { show: true, stroke: theme.gridColor, width: 1 },
            ticks: { show: true, stroke: theme.gridColor, size: 5 },
            values: (_u, vals) =>
                vals.map((v) => {
                    const idx = Math.round(v);
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
        y: { auto: true },
    };

    if (yAxis.domain) {
        const [min, max] = yAxis.domain;
        if (min !== 'auto' && max !== 'auto') {
            scales.y = { auto: false, range: [min, max] };
        } else if (min !== 'auto') {
            scales.y = {
                auto: true,
                range: (_u: uPlot, _dataMin: number, dataMax: number) => [min, dataMax],
            };
        } else if (max !== 'auto') {
            scales.y = {
                auto: true,
                range: (_u: uPlot, dataMin: number, _dataMax: number) => [dataMin, max],
            };
        }
    }

    if (yAxisSecondary) {
        scales.y2 = { auto: true };
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

    constructor(container: HTMLElement) {
        this.container = container;

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

        const { dataZoom, series } = config;

        // Build plugins
        const plugins: uPlot.Plugin[] = [];

        if (dataZoom?.enabled) {
            plugins.push(createZoomPlugin({}));
        }

        const bandSeries = series.filter((s) => s.type === 'band' && s.bandData);
        if (bandSeries.length > 0) {
            plugins.push(createBandFillPlugin({ series: bandSeries }));
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
     * Destroy the chart and clean up resources.
     */
    destroy(): void {
        if (this.isDestroyed) return;

        console.log('[ChartManager] Destroying');

        this.isDestroyed = true;

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

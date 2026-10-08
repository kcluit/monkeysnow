/**
 * Chart Manager
 *
 * Vanilla JS class that manages uPlot lifecycle independently of React.
 * Handles chart creation, updates, zoom state preservation, and destruction.
 */

import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { ChartConfig } from './types';
import { createZoomPlugin, createTouchPlugin, createBandFillPlugin, createBoxWhiskerPlugin, createHeatmapPlugin, createWindArrowPlugin, createZeroAxisPlugin, createElevationLinesPlugin, createTooltipPlugin, createLegendPlugin, createSeriesFocusPlugin } from './plugins';
import { colorWithOpacity } from './utils/colorUtils';
import {
    subscribeToZoomChanges,
    broadcastZoomChange,
    isChartZoomSyncEnabled,
} from './chartRegistry';

/**
 * Generate a structural key for comparison.
 * Only changes to structural properties should trigger a chart rebuild. Anything else
 * is applied to the existing chart, whose axes and plugins read the latest config
 * whenever they draw.
 */
function getStructuralKey(config: ChartConfig): string {
    return JSON.stringify({
        type: config.type,
        xAxisType: config.xAxis.type,
        // A longer or shorter axis needs fresh zoom bounds
        xLength: config.xAxis.data.length,
        seriesIds: config.series.map(s => s.id),
        seriesTypes: config.series.map(s => s.type),
        seriesColors: config.series.map(s => s.color),
        // Line styles are baked into the uPlot series when the chart is built
        seriesOpacity: config.series.map(s => s.opacity ?? 1),
        seriesYAxisIndex: config.series.map(s => s.yAxisIndex ?? 0),
        hasBandData: config.series.map(s => !!s.bandData),
        hasSecondaryAxis: !!config.yAxisSecondary,
        hasElevationLines: !!config.elevationLines,
        dataZoomEnabled: config.dataZoom?.enabled ?? false,
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
 * Determine decimal places based on data range.
 * Smaller ranges get more precision for readable axis labels.
 */
function getDecimalPlaces(range: number): number {
    // Handle invalid ranges (zero, negative, NaN, Infinity)
    if (!Number.isFinite(range) || range <= 0) {
        return 0; // Safe default: integers
    }
    if (range >= 10) return 0;
    if (range >= 1) return 1;
    if (range >= 0.1) return 2;
    return 3;
}

/**
 * Format a y-axis value with appropriate decimal places based on the scale range.
 */
function formatYAxisValue(value: number, scaleMin: number, scaleMax: number): string {
    const range = scaleMax - scaleMin;
    const decimals = getDecimalPlaces(range);
    return decimals === 0 ? Math.round(value).toString() : value.toFixed(decimals);
}

/** Tick spacing in hours; up to a day they divide 24, so ticks land on the same clock hours each day. */
const NICE_INCREMENTS = [1, 2, 3, 4, 6, 8, 12, 24, 48, 72, 96];

/**
 * Splits for the hourly x axis, placed on local clock hours: every `incr` hours from
 * midnight, or every few midnights for multi-day spacing on narrow screens. Reading
 * each point's hour, rather than counting 24 points a day, keeps the day ticks on
 * midnight across daylight-saving changes.
 */
function createClockAlignedSplits(getConfig: () => ChartConfig) {
    return (_u: uPlot, _axisIdx: number, scaleMin: number, scaleMax: number, foundIncr: number): number[] => {
        const { data, hours = [], midnightIndices = [] } = getConfig().xAxis;
        const wanted = Math.max(1, Math.round(foundIncr));
        const incr = NICE_INCREMENTS.find((nice) => nice >= wanted) ?? Math.ceil(wanted / 24) * 24;
        const first = Math.max(0, Math.ceil(scaleMin));
        const last = Math.min(data.length - 1, Math.floor(scaleMax));
        const splits: number[] = [];

        if (incr >= 48) {
            const dayStep = Math.round(incr / 24);
            const visibleMidnights = midnightIndices.filter((i) => i >= first && i <= last);
            for (let k = 0; k < visibleMidnights.length; k += dayStep) {
                splits.push(visibleMidnights[k]);
            }
            return splits;
        }

        for (let i = first; i <= last; i++) {
            // The hour repeated when clocks go back gets a single tick
            if (hours[i] % incr === 0 && (i === 0 || hours[i - 1] !== hours[i])) {
                splits.push(i);
            }
        }
        return splits;
    };
}

/**
 * Build uPlot axes configuration. Labels come from the latest config, so a data
 * update with new time labels doesn't need a rebuild.
 */
function buildUPlotAxes(config: ChartConfig, getConfig: () => ChartConfig): uPlot.Axis[] {
    const { xAxis, yAxisSecondary, theme } = config;

    const axes: uPlot.Axis[] = [
        {
            scale: 'x',
            stroke: theme.textSecondary,
            grid: { show: true, stroke: theme.gridColor, width: 1 },
            ticks: { show: true, stroke: theme.gridColor, size: 5 },
            border: { show: true, stroke: theme.textSecondary, width: 2 },
            splits: xAxis.hours ? createClockAlignedSplits(getConfig) : undefined,
            values: (_u, vals) => {
                const labels = getConfig().xAxis.data;
                return vals.map((v) => labels[Math.round(v)] ?? '');
            },
            gap: 8,
            // Multi-day tick skipping handles narrow screens, no rotation needed
            size: 40,
            font: '11px system-ui, -apple-system, sans-serif',
        },
        {
            stroke: theme.textSecondary,
            grid: { show: true, stroke: theme.gridColor, width: 1 },
            ticks: { show: true, stroke: theme.gridColor, size: 5 },
            border: { show: true, stroke: theme.textSecondary, width: 2 },
            values: (u, vals) => {
                const scale = u.scales.y;
                const min = scale?.min ?? 0;
                const max = scale?.max ?? 100;
                return vals.map((v) => Number.isFinite(v) ? formatYAxisValue(v, min, max) : '');
            },
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
            values: (u, vals) => {
                const scale = u.scales.y2;
                const min = scale?.min ?? 0;
                const max = scale?.max ?? 100;
                return vals.map((v) => Number.isFinite(v) ? formatYAxisValue(v, min, max) : '');
            },
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

    /** Axes and plugins call this while drawing; a chart only exists once a config has been set. */
    private readonly getConfig = (): ChartConfig => this.currentConfig!;

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
        // Set first: axes and plugins read it while the chart redraws below
        this.currentConfig = config;

        if (newStructuralKey !== this.structuralKey) {
            this.rebuildChart(config, newStructuralKey);
        } else if (this.chart) {
            if (this.chart.height !== config.height) {
                this.chart.setSize({ width: this.container.offsetWidth, height: config.height });
            }
            // Data-only change - use setData with resetScales=false to preserve zoom
            this.chart.setData(transformToUPlotData(config), false);
        }
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
            // Container not ready yet; handleResize creates the chart once it has a width
            return;
        }

        // Validate we have data to display
        if (config.xAxis.data.length === 0 || config.series.length === 0) {
            return;
        }

        const { dataZoom, series } = config;
        const getConfig = this.getConfig;

        // Build plugins
        const plugins: uPlot.Plugin[] = [];

        if (dataZoom?.enabled) {
            const onZoomChange = (min: number, max: number) => {
                if (isChartZoomSyncEnabled(this.chartId)) {
                    broadcastZoomChange(min, max, this.chartId);
                }
            };
            plugins.push(createZoomPlugin({ onZoom: onZoomChange }));
            plugins.push(createTouchPlugin({ onZoom: onZoomChange }));
        }

        if (series.some((s) => s.type === 'band' && s.bandData)) {
            plugins.push(createBandFillPlugin({ getConfig }));
        }

        // Box & whisker plugin - draws ensemble spread visualization
        if (series.some((s) => s.type === 'boxwhisker' && s.boxWhiskerData)) {
            plugins.push(createBoxWhiskerPlugin({ getConfig }));
        }

        // Heatmap plugin - draws hour-of-day matrix visualization
        if (series.some((s) => s.type === 'heatmap' && s.heatmapData)) {
            plugins.push(createHeatmapPlugin({ getConfig }));
        }

        // Wind arrow plugin - draws directional arrows on wind speed charts
        if (series.some((s) => s.windArrowData)) {
            plugins.push(createWindArrowPlugin({ getConfig }));
        }

        // Zero axis plugin - draws bold line at y=0 for charts that cross zero
        plugins.push(createZeroAxisPlugin({ theme: config.theme }));

        // Elevation lines plugin - draws horizontal lines for base/mid/top elevations on freezing level charts
        if (config.elevationLines) {
            plugins.push(createElevationLinesPlugin({ getConfig }));
        }

        // Series focus plugin - highlights series on cursor proximity or legend hover
        const seriesFocus = createSeriesFocusPlugin();
        plugins.push(seriesFocus.plugin);

        // Tooltip plugin - shows values at cursor position
        plugins.push(createTooltipPlugin({ getConfig }));

        // Legend plugin - interactive series toggle with focus integration
        plugins.push(createLegendPlugin({
            getConfig,
            onSeriesHover: seriesFocus.handleLegendHover,
        }));

        // Build uPlot options
        const opts: uPlot.Options = {
            width,
            height: config.height,
            series: buildUPlotSeries(config),
            axes: buildUPlotAxes(config, getConfig),
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
                height: this.currentConfig?.height ?? 300,
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
        // A heatmap's x axis is days, not the hours the other charts zoom over
        if (this.currentConfig?.type === 'heatmap') return;

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

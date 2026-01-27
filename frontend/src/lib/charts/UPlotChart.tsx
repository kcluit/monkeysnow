/**
 * UPlot Chart Component
 *
 * React wrapper for uPlot that handles lifecycle, plugins, and data transformation.
 */

import { useEffect, useRef, useCallback } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { ChartConfig } from './types';
import {
    createZoomPlugin,
    createTooltipPlugin,
    createLegendPlugin,
    createSyncPlugin,
    createMarkLinesPlugin,
    createBandFillPlugin,
} from './plugins';
import { colorWithOpacity } from './utils/colorUtils';

export interface UPlotChartProps {
    config: ChartConfig;
    /** Sync key for coordinating zoom/pan across charts */
    syncKey?: string;
    /** Additional CSS class */
    className?: string;
    /** Callback when series visibility changes */
    onSeriesToggle?: (seriesId: string, visible: boolean) => void;
}

/**
 * Transform ChartConfig series to uPlot columnar data format.
 * uPlot expects: [xValues, yValues1, yValues2, ...]
 */
function transformToUPlotData(config: ChartConfig): uPlot.AlignedData {
    const { xAxis, series } = config;

    // X-axis: use indices for category axis
    const xData = xAxis.data.map((_, idx) => idx);

    // Y-axis: extract data from each series
    const yData = series.map((s) => s.data.map((v) => (v === null ? null : v)));

    return [xData, ...yData] as uPlot.AlignedData;
}

/**
 * Build uPlot series configuration from ChartConfig.
 */
function buildUPlotSeries(config: ChartConfig): uPlot.Series[] {
    const { series } = config;

    // First series is always x-axis placeholder
    const uplotSeries: uPlot.Series[] = [{}];

    for (const s of series) {
        const stroke = s.color;
        const opacity = s.opacity ?? 1;

        // Calculate fill color for area charts
        let fill: string | undefined;
        if (s.type === 'area') {
            const fillOpacity = s.fillOpacity ?? 0.3;
            fill = colorWithOpacity(s.color, fillOpacity * opacity);
        }

        // Determine line dash pattern
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
        // X-axis (bottom)
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
        // Y-axis (left)
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

    // Add secondary Y-axis if present
    if (yAxisSecondary) {
        axes.push({
            stroke: theme.textSecondary,
            grid: { show: false },
            ticks: { show: true, stroke: theme.gridColor, size: 5 },
            values: (_u, vals) => vals.map((v) => yAxisSecondary.formatter(v)),
            gap: 8,
            size: 50,
            font: '11px system-ui, -apple-system, sans-serif',
            side: 1, // Right side
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
        x: {
            time: false, // Category axis
        },
        y: {
            auto: true,
        },
    };

    // Apply domain constraints if specified
    if (yAxis.domain) {
        const [min, max] = yAxis.domain;
        if (min !== 'auto' && max !== 'auto') {
            scales.y = {
                auto: false,
                range: [min, max],
            };
        } else if (min !== 'auto') {
            // Min specified, auto max - use range function
            scales.y = {
                auto: true,
                range: (_u: uPlot, _dataMin: number, dataMax: number) => [min, dataMax],
            };
        } else if (max !== 'auto') {
            // Auto min, max specified - use range function
            scales.y = {
                auto: true,
                range: (_u: uPlot, dataMin: number, _dataMax: number) => [dataMin, max],
            };
        }
    }

    // Add secondary scale if needed
    if (yAxisSecondary) {
        scales.y2 = {
            auto: true,
        };
    }

    return scales;
}

export function UPlotChart({
    config,
    syncKey,
    className,
    onSeriesToggle,
}: UPlotChartProps): JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<uPlot | null>(null);

    // Build chart
    const buildChart = useCallback(() => {
        if (!containerRef.current) return;

        // Destroy existing chart
        chartRef.current?.destroy();

        const width = containerRef.current.offsetWidth;
        const { theme, tooltip, legend, dataZoom, markLines, series } = config;

        // Build plugins
        const plugins: uPlot.Plugin[] = [];

        // Zoom plugin (if enabled)
        if (dataZoom?.enabled) {
            plugins.push(createZoomPlugin({}));
        }

        // Sync plugin (if syncKey provided)
        if (syncKey) {
            plugins.push(createSyncPlugin({ syncKey }));
        }

        // Tooltip plugin
        if (tooltip.enabled) {
            plugins.push(
                createTooltipPlugin({
                    theme,
                    xLabels: config.xAxis.data,
                    formatValue: (seriesIdx, value) => {
                        if (value === null || value === undefined) return 'N/A';
                        const seriesConfig = series[seriesIdx - 1];
                        // Use the appropriate axis formatter
                        if (seriesConfig?.yAxisIndex === 1 && config.yAxisSecondary) {
                            return config.yAxisSecondary.formatter(value);
                        }
                        return config.yAxis.formatter(value);
                    },
                })
            );
        }

        // Legend plugin
        if (legend.enabled) {
            plugins.push(
                createLegendPlugin({
                    theme,
                    onToggle: (seriesIdx, visible) => {
                        const seriesConfig = series[seriesIdx - 1];
                        if (seriesConfig && onSeriesToggle) {
                            onSeriesToggle(seriesConfig.id, visible);
                        }
                    },
                })
            );
        }

        // Mark lines plugin (elevation markers)
        if (markLines && markLines.length > 0) {
            plugins.push(createMarkLinesPlugin({ markLines, theme }));
        }

        // Band fill plugin
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
                drag: { x: false, y: false }, // Handled by zoom plugin
                focus: { prox: 30 },
                sync: syncKey
                    ? {
                          key: syncKey,
                          setSeries: true,
                      }
                    : undefined,
            },
            legend: {
                show: false, // Custom legend via plugin
            },
            padding: [
                config.grid.top,
                config.grid.right,
                config.grid.bottom,
                config.grid.left,
            ],
        };

        // Transform data
        const data = transformToUPlotData(config);

        // Create chart
        chartRef.current = new uPlot(opts, data, containerRef.current);
    }, [config, syncKey, onSeriesToggle]);

    // Initialize chart
    useEffect(() => {
        buildChart();

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [buildChart]);

    // Handle resize
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(() => {
            if (containerRef.current && chartRef.current) {
                const width = containerRef.current.offsetWidth;
                chartRef.current.setSize({ width, height: config.height });
            }
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [config.height]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ width: '100%', minHeight: config.height }}
        />
    );
}

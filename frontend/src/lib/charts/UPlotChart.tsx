/**
 * UPlot Chart Component
 *
 * React wrapper for uPlot that handles lifecycle, plugins, and data transformation.
 * Supports data-only updates via setData() to preserve zoom state.
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { ChartConfig, SeriesDefinition } from './types';
import {
    createZoomPlugin,
    createTooltipPlugin,
    createLegendPlugin,
    createMarkLinesPlugin,
    createBandFillPlugin,
} from './plugins';
import { colorWithOpacity } from './utils/colorUtils';
import { extractZoomState, type ZoomState } from './utils/zoomState';

export interface UPlotChartProps {
    config: ChartConfig;
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
        hasMarkLines: !!config.markLines?.length,
        markLineCount: config.markLines?.length ?? 0,
        dataZoomEnabled: config.dataZoom?.enabled ?? false,
        height: config.height,
        // Theme affects colors so include key colors
        themeAccent: config.theme.accent,
        themeBackground: config.theme.background,
    });
}

export function UPlotChart({
    config,
    className,
    onSeriesToggle,
}: UPlotChartProps): JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<uPlot | null>(null);
    const structuralKeyRef = useRef<string>('');
    const zoomStateRef = useRef<ZoomState | null>(null);

    // Compute structural key for the current config
    const currentStructuralKey = useMemo(() => getStructuralKey(config), [config]);

    // Transform data for uPlot
    const uplotData = useMemo(() => transformToUPlotData(config), [config]);

    // Build chart (called on structural changes)
    const buildChart = useCallback((initialZoomState: ZoomState | null = null) => {
        if (!containerRef.current) return;

        console.log('[UPlotChart] buildChart called', {
            configId: config.series[0]?.name,
            hasInitialZoom: !!initialZoomState,
        });

        // Destroy existing chart
        if (chartRef.current) {
            console.log('[UPlotChart] Destroying existing chart');
            chartRef.current.destroy();
        }

        const width = containerRef.current.offsetWidth;
        const { theme, tooltip, legend, dataZoom, markLines, series } = config;

        // Build plugins
        const plugins: uPlot.Plugin[] = [];

        // Zoom plugin (if enabled)
        if (dataZoom?.enabled) {
            plugins.push(createZoomPlugin({
                initialZoomState,
            }));
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
                sync: undefined,
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

        // Create chart
        chartRef.current = new uPlot(opts, uplotData, containerRef.current);
    }, [config, onSeriesToggle, uplotData]);

    // Handle structural changes (requires rebuild)
    useEffect(() => {
        const isStructuralChange = currentStructuralKey !== structuralKeyRef.current;

        if (isStructuralChange) {
            console.log('[UPlotChart] Structural change detected - rebuilding chart');

            // Save zoom state before destroying
            if (chartRef.current) {
                zoomStateRef.current = extractZoomState(chartRef.current);
            }

            // Update structural key
            structuralKeyRef.current = currentStructuralKey;

            // Rebuild with restored zoom
            buildChart(zoomStateRef.current);
        }

        return () => {
            // Cleanup on unmount
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [currentStructuralKey, buildChart]);

    // Handle data-only changes (use setData)
    useEffect(() => {
        // Skip if no chart or if this is a structural change (handled above)
        if (!chartRef.current || currentStructuralKey !== structuralKeyRef.current) {
            return;
        }

        console.log('[UPlotChart] Data-only update - using setData()');

        // Use setData() to update data without rebuilding
        chartRef.current.setData(uplotData);
    }, [uplotData, currentStructuralKey]);

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

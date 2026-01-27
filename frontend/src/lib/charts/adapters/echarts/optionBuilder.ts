/**
 * ECharts Option Builder
 *
 * Converts library-agnostic ChartConfig to ECharts-specific option object.
 */

import type { ChartConfig, ChartTheme, MarkLineData } from '../../types';
import { buildSeries } from './seriesBuilders';

/** Generic option type to avoid complex ECharts type conflicts */
type ChartOption = Record<string, unknown>;

/** Maximum number of series to show in tooltip (0 = unlimited) */
const MAX_TOOLTIP_SERIES = 0;

/** Global throttle value for pointer events (ms) */
const POINTER_THROTTLE_MS = 100;

/** Threshold for disabling tooltip entirely */
const TOOLTIP_DISABLE_THRESHOLD = 5000;

/**
 * RAF-throttled tooltip formatter for smooth 60fps performance.
 * Uses requestAnimationFrame pattern to ensure tooltip updates don't block rendering.
 */
let lastTooltipDataIndex: number | undefined;
let pendingTooltipResult = '';

function formatTooltip(params: unknown): string {
    if (!Array.isArray(params) || params.length === 0) return '';

    const first = params[0] as { axisValueLabel?: string; dataIndex?: number };
    const currentDataIndex = first.dataIndex;

    // If same data point, return cached result immediately
    if (currentDataIndex === lastTooltipDataIndex && pendingTooltipResult) {
        return pendingTooltipResult;
    }

    // Update the data index
    lastTooltipDataIndex = currentDataIndex;

    // Build tooltip - show all series when MAX_TOOLTIP_SERIES is 0
    const header = first.axisValueLabel || '';
    const displayCount = MAX_TOOLTIP_SERIES > 0 ? Math.min(params.length, MAX_TOOLTIP_SERIES) : params.length;
    const hasMore = MAX_TOOLTIP_SERIES > 0 && params.length > MAX_TOOLTIP_SERIES;

    // Pre-allocate array for faster join
    const lines: string[] = [`<div style="font-weight:600;margin-bottom:4px">${header}</div>`];
    for (let i = 0; i < displayCount; i++) {
        const p = params[i] as { marker?: string; seriesName?: string; value?: unknown };
        if (p.value == null) continue;
        const val = typeof p.value === 'number' ? Math.round(p.value * 10) / 10 : p.value;
        lines.push(`<div style="display:flex;justify-content:space-between;gap:12px"><span>${p.marker || ''}${p.seriesName || ''}</span><span style="font-weight:500">${val}</span></div>`);
    }

    if (hasMore) {
        lines.push(`<div style="color:#999;margin-top:4px">+${params.length - MAX_TOOLTIP_SERIES} more</div>`);
    }

    pendingTooltipResult = lines.join('');
    return pendingTooltipResult;
}

/**
 * Build tooltip configuration for ECharts.
 * Optimized for performance during rapid mouse movements.
 */
function buildTooltip(config: ChartConfig, _theme: ChartTheme, _totalDataPoints: number): ChartOption {
    if (config.tooltip?.enabled === false) {
        return { show: false };
    }

    return {
        show: true,
        trigger: config.tooltip?.trigger ?? 'axis',
        appendToBody: true, // Render tooltip in document body to allow overflow outside chart card
        renderMode: 'html',
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 6,
        padding: [10, 14],
        textStyle: {
            color: '#1f2937',
            fontSize: 12,
        },
        transitionDuration: 0,
        showDelay: 0,
        hideDelay: 0, // No hide delay - tooltip hides when mouse leaves chart
        confine: false, // Allow tooltip to render anywhere on screen
        alwaysShowContent: true, // Keep tooltip visible while mouse is in chart area
        axisPointer: {
            type: 'line',
            animation: false,
            snap: true,
            triggerEmphasis: false,
            triggerTooltip: true,
            lineStyle: {
                color: 'rgba(150, 150, 150, 0.5)',
                width: 1,
            },
            label: {
                show: false,
            },
        },
        // Allow scrolling for many models, use screen space efficiently
        extraCssText: 'max-height: 70vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15); pointer-events: auto;',
        enterable: true, // Allow mouse to enter tooltip for scrolling
        formatter: formatTooltip,
    };
}

/**
 * Build legend configuration for ECharts.
 */
function buildLegend(config: ChartConfig, theme: ChartTheme): ChartOption {
    if (config.legend?.enabled === false) {
        return { show: false };
    }

    // When dataZoom is disabled (chart locked), legend can move down to where the slider was
    const hasDataZoom = config.dataZoom?.enabled !== false;
    const bottomPosition = hasDataZoom ? 50 : 10;

    const positionMap: Record<string, object> = {
        top: { top: 0 },
        bottom: { bottom: bottomPosition },
        left: { left: 0, orient: 'vertical' },
        right: { right: 0, orient: 'vertical' },
    };

    return {
        show: true,
        ...positionMap[config.legend?.position ?? 'bottom'],
        textStyle: {
            color: theme.textSecondary,
            fontSize: 12,
        },
        // Performance: disable legend hover interactions entirely
        silent: true,
        // Performance: disable legend selection emphasis (hover effects)
        emphasis: {
            selectorLabel: {
                show: false,
            },
        },
        // Performance: disable series selection via legend
        selectedMode: false,
        inactiveColor: theme.gridLine,
    };
}

/**
 * Build grid (margins) configuration for ECharts.
 */
function buildGrid(config: ChartConfig): ChartOption {
    const grid = config.grid ?? {
        top: 10,
        right: 30,
        bottom: 80, // Space for legend and dataZoom
        left: 10,
        containLabel: true,
    };

    return {
        top: grid.top,
        right: grid.right,
        bottom: grid.bottom,
        left: grid.left,
        containLabel: grid.containLabel ?? true,
    };
}

/**
 * Build X-axis configuration for ECharts.
 */
function buildXAxis(config: ChartConfig, theme: ChartTheme): ChartOption {
    const interval = config.xAxis.data
        ? Math.floor(config.xAxis.data.length / 14)
        : 'auto';

    return {
        type: config.xAxis.type,
        data: config.xAxis.data,
        // Performance: disable axis interactions
        silent: true,
        triggerEvent: false,
        axisLine: {
            lineStyle: {
                color: theme.gridLine,
            },
        },
        axisTick: {
            lineStyle: {
                color: theme.gridLine,
            },
        },
        axisLabel: {
            color: theme.textSecondary,
            fontSize: 11,
            interval,
        },
        splitLine: {
            show: true,
            lineStyle: {
                color: theme.gridLine,
                opacity: 0.3,
                type: 'dashed',
            },
        },
    };
}

/**
 * Build a single Y-axis configuration for ECharts.
 */
function buildSingleYAxis(
    axisConfig: ChartConfig['yAxis'],
    theme: ChartTheme,
    position: 'left' | 'right',
    showSplitLine: boolean
): ChartOption {
    const domain = axisConfig.domain ?? ['auto', 'auto'];

    return {
        type: 'value',
        position,
        min: domain[0] === 'auto' ? undefined : domain[0],
        max: domain[1] === 'auto' ? undefined : domain[1],
        // Performance: disable axis interactions
        silent: true,
        triggerEvent: false,
        axisLine: {
            lineStyle: {
                color: theme.gridLine,
            },
        },
        axisTick: {
            lineStyle: {
                color: theme.gridLine,
            },
        },
        axisLabel: {
            color: theme.textSecondary,
            fontSize: 11,
            formatter: axisConfig.formatter
                ? (value: number) => axisConfig.formatter!(value)
                : (value: number) => `${Math.round(value)}`,
        },
        splitLine: {
            show: showSplitLine,
            lineStyle: {
                color: theme.gridLine,
                opacity: 0.3,
                type: 'dashed',
            },
        },
    };
}

/**
 * Build Y-axis configuration for ECharts.
 * Returns an array if secondary axis is defined.
 */
function buildYAxis(config: ChartConfig, theme: ChartTheme): ChartOption | ChartOption[] {
    if (config.yAxisSecondary) {
        // Dual Y-axis: primary on left, secondary on right
        return [
            buildSingleYAxis(config.yAxis, theme, 'left', true),
            buildSingleYAxis(config.yAxisSecondary, theme, 'right', false),
        ];
    }

    // Single Y-axis
    return buildSingleYAxis(config.yAxis, theme, 'left', true);
}

/**
 * Build dataZoom (brush/zoom) configuration for ECharts.
 * Optimized for smooth interactions.
 */
function buildDataZoom(config: ChartConfig, theme: ChartTheme): ChartOption[] | undefined {
    if (config.dataZoom?.enabled === false) {
        return undefined;
    }

    const zoomType = config.dataZoom?.type ?? 'both';
    const range = config.dataZoom?.range ?? [0, 100];
    const components: ChartOption[] = [];

    // Slider (visible zoom bar)
    if (zoomType === 'slider' || zoomType === 'both') {
        components.push({
            type: 'slider',
            xAxisIndex: 0,
            start: range[0],
            end: range[1],
            height: 40,
            borderColor: theme.gridLine,
            fillerColor: `${theme.accent}40`, // 25% opacity
            handleStyle: {
                color: theme.accent,
            },
            textStyle: {
                color: theme.textSecondary,
            },
            dataBackground: {
                lineStyle: {
                    color: theme.gridLine,
                },
                areaStyle: {
                    color: `${theme.gridLine}40`,
                },
            },
            // Performance: Throttle slider updates
            throttle: 50,
            // Performance: Don't redraw during drag
            realtime: true,
        });
    }

    // Inside zoom (mouse wheel / touch)
    if (zoomType === 'inside' || zoomType === 'both') {
        components.push({
            type: 'inside',
            xAxisIndex: 0,
            start: range[0],
            end: range[1],
            zoomOnMouseWheel: true,
            // Performance: DISABLE moveOnMouseMove - major perf improvement
            moveOnMouseMove: false,
            // Performance: Throttle inside zoom updates
            throttle: 100,
        });
    }

    return components.length > 0 ? components : undefined;
}

/**
 * Build ECharts markLine configuration from MarkLineData array.
 */
function buildMarkLine(markLines: MarkLineData[]): ChartOption {
    return {
        silent: true, // Don't trigger events
        symbol: 'none', // No arrow symbols at ends
        animation: false,
        data: markLines.map((ml) => ({
            yAxis: ml.yValue,
            label: {
                show: true,
                formatter: ml.label,
                position: 'insideEndTop',
                color: ml.color,
                fontSize: 11,
                fontWeight: ml.lineWidth >= 2 ? 'bold' : 'normal',
            },
            lineStyle: {
                color: ml.color,
                width: ml.lineWidth,
                type: ml.lineStyle,
            },
        })),
    };
}

/**
 * Convert ChartConfig to complete ECharts option object.
 * Includes performance optimizations for large datasets and frequent interactions.
 */
export function buildEChartsOption(config: ChartConfig): ChartOption {
    const theme = config.theme;

    // Build series from config
    const series = config.series.map((s) => buildSeries(s));

    // If we have markLines, attach them to the first series
    if (config.markLines && config.markLines.length > 0 && series.length > 0) {
        (series[0] as ChartOption).markLine = buildMarkLine(config.markLines);
    }

    // Calculate total data points for performance tuning
    const totalDataPoints = series.reduce((sum, s) => {
        const data = (s as { data?: unknown[] }).data;
        return sum + (Array.isArray(data) ? data.length : 0);
    }, 0);

    // Performance thresholds
    const isLargeDataset = totalDataPoints > 2000;

    return {
        backgroundColor: theme.background,
        // Performance: disable all animations
        animation: false,
        animationDuration: 0,
        animationDurationUpdate: 0,
        // Performance: use progressive rendering for large datasets
        progressive: isLargeDataset ? 20 : 50,
        progressiveThreshold: 200,
        // Performance: CRITICAL - disable hover layer entirely (no separate layer for hover effects)
        hoverLayerThreshold: Infinity,
        // Performance: use UTC to avoid timezone calculations
        useUTC: true,
        // Performance: CRITICAL - increase global throttle for pointer events
        // Higher value = fewer updates = smoother FPS during rapid mouse movement
        throttle: POINTER_THROTTLE_MS,
        // Performance: completely disable state animation (hover/emphasis effects)
        stateAnimation: {
            duration: 0,
            easing: 'linear',
        },
        // Performance: disable blend mode (avoids expensive compositing)
        blendMode: undefined,
        // Performance: simplify renderer
        silent: false, // Need events for tooltip, but series are silent
        grid: buildGrid(config),
        xAxis: buildXAxis(config, theme),
        yAxis: buildYAxis(config, theme),
        series,
        tooltip: buildTooltip(config, theme, totalDataPoints),
        legend: buildLegend(config, theme),
        dataZoom: buildDataZoom(config, theme),
    };
}

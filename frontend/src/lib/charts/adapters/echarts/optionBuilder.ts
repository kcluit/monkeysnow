/**
 * ECharts Option Builder
 *
 * Converts library-agnostic ChartConfig to ECharts-specific option object.
 */

import type { ChartConfig, ChartTheme, MarkLineData } from '../../types';
import { buildSeries } from './seriesBuilders';

/** Generic option type to avoid complex ECharts type conflicts */
type ChartOption = Record<string, unknown>;

/**
 * Build tooltip configuration for ECharts.
 */
function buildTooltip(config: ChartConfig, _theme: ChartTheme): ChartOption {
  if (config.tooltip?.enabled === false) {
    return { show: false };
  }

  return {
    show: true,
    trigger: config.tooltip?.trigger ?? 'axis',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#ccc',
    borderWidth: 1,
    textStyle: {
      color: '#000',
      fontSize: 13,
    },
    axisPointer: {
      type: 'line',
      lineStyle: {
        color: '#666',
        type: 'dashed',
      },
    },
    extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);',
    formatter: (params: unknown) => {
      if (!Array.isArray(params)) return '';
      const lines = params.map((p: { marker?: string; seriesName?: string; value?: unknown }) => {
        const value = typeof p.value === 'number'
          ? (Number.isInteger(p.value) ? p.value : parseFloat(p.value.toFixed(2)))
          : p.value;
        return `${p.marker || ''} ${p.seriesName || ''}: ${value}`;
      });
      const header = (params[0] as { axisValueLabel?: string })?.axisValueLabel || '';
      return `${header}<br/>${lines.join('<br/>')}`;
    },
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
 * Build Y-axis configuration for ECharts.
 */
function buildYAxis(config: ChartConfig, theme: ChartTheme): ChartOption {
  const domain = config.yAxis.domain ?? ['auto', 'auto'];

  return {
    type: 'value',
    min: domain[0] === 'auto' ? undefined : domain[0],
    max: domain[1] === 'auto' ? undefined : domain[1],
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
      formatter: config.yAxis.formatter
        ? (value: number) => config.yAxis.formatter!(value)
        : (value: number) => `${Math.round(value)}`,
    },
    splitLine: {
      lineStyle: {
        color: theme.gridLine,
        opacity: 0.3,
        type: 'dashed',
      },
    },
  };
}

/**
 * Build dataZoom (brush/zoom) configuration for ECharts.
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
      moveOnMouseMove: true,
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
 */
export function buildEChartsOption(config: ChartConfig): ChartOption {
  const theme = config.theme;

  // Build series from config
  const series = config.series.map((s) => buildSeries(s));

  // If we have markLines, attach them to the first series
  if (config.markLines && config.markLines.length > 0 && series.length > 0) {
    (series[0] as ChartOption).markLine = buildMarkLine(config.markLines);
  }

  return {
    backgroundColor: theme.background,
    animation: config.animation ?? false, // Disable animation for performance by default
    grid: buildGrid(config),
    xAxis: buildXAxis(config, theme),
    yAxis: buildYAxis(config, theme),
    series,
    tooltip: buildTooltip(config, theme),
    legend: buildLegend(config, theme),
    dataZoom: buildDataZoom(config, theme),
  };
}

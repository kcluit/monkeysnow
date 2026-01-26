/**
 * ECharts Option Builder
 *
 * Converts library-agnostic ChartConfig to ECharts-specific option object.
 */

import type { EChartsOption } from 'echarts';
import type { ChartConfig, ChartTheme } from '../../types';
import { buildSeries } from './seriesBuilders';

/**
 * Build tooltip configuration for ECharts.
 */
function buildTooltip(config: ChartConfig, theme: ChartTheme): EChartsOption['tooltip'] {
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
  };
}

/**
 * Build legend configuration for ECharts.
 */
function buildLegend(config: ChartConfig, theme: ChartTheme): EChartsOption['legend'] {
  if (config.legend?.enabled === false) {
    return { show: false };
  }

  const positionMap: Record<string, object> = {
    top: { top: 0 },
    bottom: { bottom: 50 }, // Above dataZoom
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
function buildGrid(config: ChartConfig): EChartsOption['grid'] {
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
function buildXAxis(config: ChartConfig, theme: ChartTheme): EChartsOption['xAxis'] {
  const interval = config.xAxis.data
    ? Math.floor(config.xAxis.data.length / 14)
    : 'auto';

  return {
    type: config.xAxis.type,
    data: config.xAxis.data,
    axisLine: {
      lineStyle: {
        color: theme.border,
      },
    },
    axisTick: {
      lineStyle: {
        color: theme.border,
      },
    },
    axisLabel: {
      color: theme.textSecondary,
      fontSize: 11,
      interval,
    },
  };
}

/**
 * Build Y-axis configuration for ECharts.
 */
function buildYAxis(config: ChartConfig, theme: ChartTheme): EChartsOption['yAxis'] {
  const domain = config.yAxis.domain ?? ['auto', 'auto'];

  return {
    type: 'value',
    min: domain[0] === 'auto' ? undefined : domain[0],
    max: domain[1] === 'auto' ? undefined : domain[1],
    axisLine: {
      lineStyle: {
        color: theme.border,
      },
    },
    axisTick: {
      lineStyle: {
        color: theme.border,
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
        color: theme.border,
        opacity: 0.3,
        type: 'dashed',
      },
    },
  };
}

/**
 * Build dataZoom (brush/zoom) configuration for ECharts.
 */
function buildDataZoom(config: ChartConfig, theme: ChartTheme): EChartsOption['dataZoom'] {
  if (config.dataZoom?.enabled === false) {
    return undefined;
  }

  const zoomType = config.dataZoom?.type ?? 'both';
  const range = config.dataZoom?.range ?? [0, 100];
  const components: EChartsOption['dataZoom'] = [];

  // Slider (visible zoom bar)
  if (zoomType === 'slider' || zoomType === 'both') {
    components.push({
      type: 'slider',
      xAxisIndex: 0,
      start: range[0],
      end: range[1],
      height: 40,
      borderColor: theme.border,
      fillerColor: `${theme.accent}40`, // 25% opacity
      handleStyle: {
        color: theme.accent,
      },
      textStyle: {
        color: theme.textSecondary,
      },
      dataBackground: {
        lineStyle: {
          color: theme.border,
        },
        areaStyle: {
          color: `${theme.border}40`,
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
 * Convert ChartConfig to complete ECharts option object.
 */
export function buildEChartsOption(config: ChartConfig): EChartsOption {
  const theme = config.theme;

  // Build series from config
  const series = config.series.map((s) => buildSeries(s));

  return {
    backgroundColor: theme.background,
    grid: buildGrid(config),
    xAxis: buildXAxis(config, theme),
    yAxis: buildYAxis(config, theme),
    series,
    tooltip: buildTooltip(config, theme),
    legend: buildLegend(config, theme),
    dataZoom: buildDataZoom(config, theme),
  };
}

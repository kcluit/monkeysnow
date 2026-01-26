/**
 * ECharts Series Builders
 *
 * Functions to build ECharts series options for different chart types.
 */

import type { SeriesConfig } from '../../types';
import type { LineSeriesOption, BarSeriesOption } from 'echarts/charts';

/**
 * Build a line series option for ECharts.
 */
export function buildLineSeries(config: SeriesConfig): LineSeriesOption {
  return {
    type: 'line',
    name: config.name,
    data: config.data,
    itemStyle: {
      color: config.color,
    },
    lineStyle: {
      color: config.color,
      width: 2,
    },
    symbol: 'none', // No data point markers for performance
    emphasis: {
      focus: 'series',
      lineStyle: {
        width: 3,
      },
    },
    animation: false, // Disable for performance
  };
}

/**
 * Build a bar series option for ECharts.
 */
export function buildBarSeries(config: SeriesConfig): BarSeriesOption {
  return {
    type: 'bar',
    name: config.name,
    data: config.data,
    itemStyle: {
      color: config.color,
      opacity: 0.8,
    },
    emphasis: {
      focus: 'series',
      itemStyle: {
        opacity: 1,
      },
    },
    animation: false,
  };
}

/**
 * Build an area series option for ECharts.
 * Area charts are line charts with areaStyle.
 */
export function buildAreaSeries(config: SeriesConfig): LineSeriesOption {
  return {
    type: 'line',
    name: config.name,
    data: config.data,
    itemStyle: {
      color: config.color,
    },
    lineStyle: {
      color: config.color,
      width: 2,
    },
    areaStyle: {
      color: config.color,
      opacity: config.fillOpacity ?? 0.3,
    },
    symbol: 'none',
    emphasis: {
      focus: 'series',
      areaStyle: {
        opacity: 0.5,
      },
    },
    animation: false,
  };
}

/**
 * Build a series option based on chart type.
 */
export function buildSeries(
  config: SeriesConfig
): LineSeriesOption | BarSeriesOption {
  switch (config.type) {
    case 'bar':
      return buildBarSeries(config);
    case 'area':
      return buildAreaSeries(config);
    case 'line':
    default:
      return buildLineSeries(config);
  }
}

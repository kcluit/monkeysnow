/**
 * ECharts Series Builders
 *
 * Functions to build ECharts series options for different chart types.
 */

import type { SeriesConfig } from '../../types';

/** Generic series option type to avoid complex ECharts type conflicts */
type SeriesOption = Record<string, unknown>;

/**
 * Build a line series option for ECharts.
 */
export function buildLineSeries(config: SeriesConfig): SeriesOption {
  const lineWidth = config.lineWidth ?? 2;
  const opacity = config.opacity ?? 1;

  return {
    type: 'line',
    name: config.name,
    data: config.data,
    z: config.zIndex ?? 2,
    itemStyle: {
      color: config.color,
      opacity,
    },
    lineStyle: {
      color: config.color,
      width: lineWidth,
      opacity,
    },
    symbol: 'none', // No data point markers for performance
    emphasis: {
      focus: 'series',
      lineStyle: {
        width: lineWidth + 1,
      },
    },
  };
}

/**
 * Build a bar series option for ECharts.
 */
export function buildBarSeries(config: SeriesConfig): SeriesOption {
  const opacity = config.opacity ?? 0.8;

  return {
    type: 'bar',
    name: config.name,
    data: config.data,
    z: config.zIndex ?? 2,
    itemStyle: {
      color: config.color,
      opacity,
    },
    emphasis: {
      focus: 'series',
      itemStyle: {
        opacity: Math.min(opacity + 0.2, 1),
      },
    },
  };
}

/**
 * Build an area series option for ECharts.
 * Area charts are line charts with areaStyle.
 */
export function buildAreaSeries(config: SeriesConfig): SeriesOption {
  const lineWidth = config.lineWidth ?? 2;
  const opacity = config.opacity ?? 1;
  const fillOpacity = config.fillOpacity ?? 0.3;

  return {
    type: 'line',
    name: config.name,
    data: config.data,
    z: config.zIndex ?? 2,
    itemStyle: {
      color: config.color,
      opacity,
    },
    lineStyle: {
      color: config.color,
      width: lineWidth,
      opacity,
    },
    areaStyle: {
      color: config.color,
      opacity: fillOpacity * opacity,
    },
    symbol: 'none',
    emphasis: {
      focus: 'series',
      areaStyle: {
        opacity: Math.min(fillOpacity + 0.2, 1) * opacity,
      },
    },
  };
}

/**
 * Build a series option based on chart type.
 */
export function buildSeries(config: SeriesConfig): SeriesOption {
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

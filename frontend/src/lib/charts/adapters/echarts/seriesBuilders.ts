/**
 * ECharts Series Builders
 *
 * Functions to build ECharts series options for different chart types.
 */

import type { SeriesConfig } from '../../types';

/** Generic series option type to avoid complex ECharts type conflicts */
type SeriesOption = Record<string, unknown>;

/** Map our line style to ECharts line type */
function mapLineStyle(style?: 'solid' | 'dashed' | 'dotted'): 'solid' | 'dashed' | 'dotted' {
  return style ?? 'solid';
}

/**
 * Build a line series option for ECharts.
 * Includes performance optimizations for large datasets.
 */
export function buildLineSeries(config: SeriesConfig): SeriesOption {
  const lineWidth = config.lineWidth ?? 2;
  const opacity = config.opacity ?? 1;
  const lineType = mapLineStyle(config.lineStyle);
  const dataLength = Array.isArray(config.data) ? config.data.length : 0;
  // Lower threshold for large mode to improve performance during hover
  const isLarge = dataLength > 100;

  const series: SeriesOption = {
    type: 'line',
    name: config.name,
    data: config.data,
    z: config.zIndex ?? 2,
    // Performance: Don't trigger mouse events on individual data points
    silent: false, // Keep false to allow tooltip, but disable other events
    triggerLineEvent: false,
    itemStyle: {
      color: config.color,
      opacity,
    },
    lineStyle: {
      color: config.color,
      width: lineWidth,
      opacity,
      type: lineType,
    },
    symbol: 'none', // No data point markers for performance
    showSymbol: false,
    // Performance: Enable large mode for datasets (lowered threshold)
    large: isLarge,
    largeThreshold: 100,
    // Performance: Use sampling to reduce points when zoomed out
    sampling: 'lttb', // Largest-Triangle-Three-Buckets algorithm preserves visual shape
    // Performance: Clip data to visible area only
    clip: true,
    // Performance: Disable hover state changes completely
    emphasis: {
      disabled: true,
    },
    // Performance: Disable selection
    select: {
      disabled: true,
    },
    // Performance: Disable blur effect
    blur: {
      disabled: true,
    },
    // Performance: Disable cursor change on hover
    cursor: 'default',
  };

  // Add yAxisIndex if specified (for secondary Y-axis)
  if (config.yAxisIndex !== undefined) {
    series.yAxisIndex = config.yAxisIndex;
  }

  return series;
}

/**
 * Build a bar series option for ECharts.
 * Includes performance optimizations for large datasets.
 */
export function buildBarSeries(config: SeriesConfig): SeriesOption {
  const opacity = config.opacity ?? 0.8;
  const dataLength = Array.isArray(config.data) ? config.data.length : 0;
  // Lower threshold for large mode to improve performance during hover
  const isLarge = dataLength > 100;

  const series: SeriesOption = {
    type: 'bar',
    name: config.name,
    data: config.data,
    z: config.zIndex ?? 2,
    itemStyle: {
      color: config.color,
      opacity,
    },
    // Performance: Enable large mode for datasets (lowered threshold)
    large: isLarge,
    largeThreshold: 100,
    // Performance: Clip data to visible area only
    clip: true,
    // Performance: Disable hover state changes completely
    emphasis: {
      disabled: true,
    },
    // Performance: Disable selection
    select: {
      disabled: true,
    },
    // Performance: Disable blur effect
    blur: {
      disabled: true,
    },
    // Performance: Disable cursor change on hover
    cursor: 'default',
  };

  // Add yAxisIndex if specified (for secondary Y-axis)
  if (config.yAxisIndex !== undefined) {
    series.yAxisIndex = config.yAxisIndex;
  }

  return series;
}

/**
 * Build an area series option for ECharts.
 * Area charts are line charts with areaStyle.
 * Includes performance optimizations for large datasets.
 */
export function buildAreaSeries(config: SeriesConfig): SeriesOption {
  const lineWidth = config.lineWidth ?? 2;
  const opacity = config.opacity ?? 1;
  const fillOpacity = config.fillOpacity ?? 0.3;
  const dataLength = Array.isArray(config.data) ? config.data.length : 0;
  // Lower threshold for large mode to improve performance during hover
  const isLarge = dataLength > 100;

  const series: SeriesOption = {
    type: 'line',
    name: config.name,
    data: config.data,
    z: config.zIndex ?? 2,
    // Performance: Don't trigger mouse events on individual data points
    triggerLineEvent: false,
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
    showSymbol: false,
    // Performance: Enable large mode for datasets (lowered threshold)
    large: isLarge,
    largeThreshold: 100,
    // Performance: Use sampling to reduce points when zoomed out
    sampling: 'lttb',
    // Performance: Clip data to visible area only
    clip: true,
    // Performance: Disable hover state changes completely
    emphasis: {
      disabled: true,
    },
    // Performance: Disable selection
    select: {
      disabled: true,
    },
    // Performance: Disable blur effect
    blur: {
      disabled: true,
    },
    // Performance: Disable cursor change on hover
    cursor: 'default',
  };

  // Add yAxisIndex if specified (for secondary Y-axis)
  if (config.yAxisIndex !== undefined) {
    series.yAxisIndex = config.yAxisIndex;
  }

  return series;
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

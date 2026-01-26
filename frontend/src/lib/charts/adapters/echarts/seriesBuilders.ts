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

  const series: SeriesOption = {
    type: 'line',
    name: config.name,
    data: config.data,
    z: config.zIndex ?? 2,
    // Performance: CRITICAL - silent mode disables most event processing on this series
    // Tooltip still works because it uses axisPointer, not series events
    silent: true,
    triggerLineEvent: false,
    // Performance: Disable hover layer for this series
    hoverLayerThreshold: Infinity,
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
    // Performance: No symbols at all
    symbol: 'none',
    showSymbol: false,
    symbolSize: 0,
    // Performance: Enable large mode with very low threshold
    large: true,
    largeThreshold: 20,
    // Performance: Use average sampling (faster than lttb)
    sampling: 'average',
    // Performance: Clip data to visible area
    clip: true,
    // Performance: Completely disable all state effects
    emphasis: {
      disabled: true,
      scale: false,
    },
    select: {
      disabled: true,
    },
    blur: {
      disabled: true,
    },
    // Performance: No cursor change
    cursor: 'default',
    // Performance: Disable animation on this series
    animation: false,
    animationDuration: 0,
    // Performance: No universal transition
    universalTransition: {
      enabled: false,
    },
    // Performance: Progressive rendering
    progressive: 100,
    progressiveThreshold: 500,
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

  const series: SeriesOption = {
    type: 'bar',
    name: config.name,
    data: config.data,
    z: config.zIndex ?? 2,
    // Performance: CRITICAL - silent mode disables event processing
    silent: true,
    hoverLayerThreshold: Infinity,
    itemStyle: {
      color: config.color,
      opacity,
    },
    // Performance: Enable large mode with low threshold
    large: true,
    largeThreshold: 20,
    // Performance: Clip data to visible area
    clip: true,
    // Performance: Disable all state effects
    emphasis: {
      disabled: true,
      scale: false,
    },
    select: {
      disabled: true,
    },
    blur: {
      disabled: true,
    },
    cursor: 'default',
    // Performance: Disable animation
    animation: false,
    animationDuration: 0,
    universalTransition: {
      enabled: false,
    },
    // Performance: Progressive rendering
    progressive: 100,
    progressiveThreshold: 500,
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
  const isLarge = dataLength > 50;

  const series: SeriesOption = {
    type: 'line',
    name: config.name,
    data: config.data,
    z: config.zIndex ?? 2,
    // Performance: CRITICAL - silent mode disables event processing
    silent: true,
    triggerLineEvent: false,
    hoverLayerThreshold: Infinity,
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
    // Performance: No symbols
    symbol: 'none',
    showSymbol: false,
    symbolSize: 0,
    // Performance: Enable large mode with low threshold
    large: true,
    largeThreshold: 20,
    // Performance: Use average sampling (faster than lttb)
    sampling: 'average',
    // Performance: Clip data
    clip: true,
    // Performance: Disable all state effects
    emphasis: {
      disabled: true,
      scale: false,
    },
    select: {
      disabled: true,
    },
    blur: {
      disabled: true,
    },
    cursor: 'default',
    // Performance: Disable animation
    animation: false,
    animationDuration: 0,
    universalTransition: {
      enabled: false,
    },
    // Performance: Progressive rendering
    progressive: 100,
    progressiveThreshold: 500,
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

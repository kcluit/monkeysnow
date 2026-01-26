/**
 * ECharts Adapter Component
 *
 * React component that renders an ECharts instance from a ChartConfig.
 * Uses echarts-for-react for React lifecycle management.
 */

import { useMemo, memo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { ChartRendererProps } from '../../types';
import { buildEChartsOption } from './optionBuilder';

/**
 * Default chart height if not specified in config.
 */
const DEFAULT_HEIGHT = 380;

/**
 * ECharts adapter component.
 * Converts library-agnostic ChartConfig to ECharts and renders.
 */
function EChartsAdapterInner({
  config,
  className,
  style,
}: ChartRendererProps): JSX.Element {
  // Build ECharts option from config
  const option = useMemo(() => buildEChartsOption(config), [config]);

  // Merge height into style
  const chartStyle = useMemo(
    () => ({
      height: `${config.height ?? DEFAULT_HEIGHT}px`,
      width: '100%',
      ...style,
    }),
    [config.height, style]
  );

  return (
    <ReactECharts
      option={option}
      style={chartStyle}
      className={className}
      opts={{ renderer: 'canvas' }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
}

/**
 * Memoized ECharts adapter to prevent unnecessary re-renders.
 */
export const EChartsAdapter = memo(EChartsAdapterInner);

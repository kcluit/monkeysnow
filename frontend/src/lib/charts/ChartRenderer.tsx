/**
 * Chart Renderer Component
 *
 * Main entry point for rendering charts. This component accepts a library-agnostic
 * ChartConfig and delegates to the appropriate adapter (currently ECharts).
 *
 * This abstraction layer allows swapping chart libraries without changing
 * consuming components.
 */

import { memo } from 'react';
import type { ChartRendererProps } from './types';
import { EChartsAdapter } from './adapters/echarts';

/**
 * Main chart renderer component.
 *
 * Currently uses ECharts, but can be extended to support other libraries
 * by adding adapter selection logic.
 */
function ChartRendererInner(props: ChartRendererProps): JSX.Element {
  // Future: Add adapter selection based on config or context
  // For now, always use ECharts
  return <EChartsAdapter {...props} />;
}

/**
 * Memoized chart renderer.
 */
export const ChartRenderer = memo(ChartRendererInner);

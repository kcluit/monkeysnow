/**
 * Chart Renderer Component
 *
 * Main entry point for rendering charts. This component accepts a library-agnostic
 * ChartConfig and delegates to the appropriate adapter (currently uPlot).
 *
 * This abstraction layer allows swapping chart libraries without changing
 * consuming components.
 */

import { memo } from 'react';
import type { ChartRendererProps } from './types';
import { UPlotChart } from './uplot/UPlotChart';

/**
 * Main chart renderer component.
 *
 * Uses uPlot for high-performance chart rendering.
 */
function ChartRendererInner(props: ChartRendererProps): JSX.Element {
    return <UPlotChart {...props} />;
}

/**
 * Memoized chart renderer.
 */
export const ChartRenderer = memo(ChartRendererInner);

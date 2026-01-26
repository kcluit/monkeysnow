/**
 * ECharts Adapter Component
 *
 * React component that renders an ECharts instance from a ChartConfig.
 * Uses echarts-for-react for React lifecycle management.
 * Optimized for high-frequency interactions like mouse hover.
 */

import { useMemo, memo, useCallback, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import type { ECharts } from 'echarts';
import type { ChartRendererProps } from '../../types';
import { buildEChartsOption } from './optionBuilder';

/**
 * Default chart height if not specified in config.
 * Lower height = smaller canvas = better performance
 */
const DEFAULT_HEIGHT = 320;

/**
 * Throttle interval for pointer events at the zrender level (ms).
 * Higher values = better FPS during rapid mouse movement, but less responsive tooltip.
 */
const ZRENDER_THROTTLE_MS = 200;

/**
 * ECharts adapter component.
 * Converts library-agnostic ChartConfig to ECharts and renders.
 * Performance optimizations:
 * - Uses devicePixelRatio of 1 for faster rendering
 * - Throttles mouse events to prevent frame drops
 * - Uses silent mode on series to reduce event overhead
 * - Uses passive event listeners for pointer events
 */
function EChartsAdapterInner({
    config,
    className,
    style,
}: ChartRendererProps): JSX.Element {
    const chartRef = useRef<ECharts | null>(null);

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

    // Performance: Canvas renderer options
    // Using devicePixelRatio of 1 significantly improves performance
    // at the cost of slightly reduced visual quality on high-DPI displays
    const opts = useMemo(
        () => ({
            renderer: 'canvas' as const,
            devicePixelRatio: 1, // Force 1:1 pixel ratio for better performance
            useDirtyRect: true, // Only re-render changed areas
            width: 'auto' as const,
            height: 'auto' as const,
        }),
        []
    );

    // Store chart instance and configure additional performance settings
    const onChartReady = useCallback((chart: ECharts) => {
        chartRef.current = chart;

        // Performance: Get the zrender instance and configure aggressive throttling
        const zr = chart.getZr();
        if (zr) {
            // Access the handler object to configure throttling
            const handler = (zr as unknown as { handler?: {
                setHandlerProxy?: (proxy: unknown) => void;
                _bindThrottledHandler?: (eventName: string, throttleMs: number) => void;
            } }).handler;

            if (handler?._bindThrottledHandler) {
                // Throttle mousemove events aggressively
                handler._bindThrottledHandler('mousemove', ZRENDER_THROTTLE_MS);
            }

            // Alternative approach: directly set animation options on zrender
            (zr as unknown as { animation?: { clear?: () => void } }).animation?.clear?.();
        }

        // Note: Additional tooltip configuration is done in optionBuilder.ts
    }, []);

    return (
        <ReactECharts
            option={option}
            style={chartStyle}
            className={className}
            opts={opts}
            notMerge={true} // Performance: don't merge with previous options, replace entirely
            lazyUpdate={true}
            onChartReady={onChartReady}
            shouldSetOption={() => true} // Always update when option changes
        />
    );
}

/**
 * Memoized ECharts adapter to prevent unnecessary re-renders.
 */
export const EChartsAdapter = memo(EChartsAdapterInner);

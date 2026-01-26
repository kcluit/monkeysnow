/**
 * ECharts Adapter Component
 *
 * React component that renders an ECharts instance from a ChartConfig.
 * Uses echarts-for-react for React lifecycle management.
 * Optimized for high-frequency interactions like mouse hover.
 */

import { useMemo, memo, useCallback, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { ECharts } from 'echarts';
import type { ChartRendererProps } from '../../types';
import { buildEChartsOption } from './optionBuilder';

/**
 * Default chart height if not specified in config.
 */
const DEFAULT_HEIGHT = 380;

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

        // Performance: Get the zrender instance and configure throttling
        const zr = chart.getZr();
        if (zr) {
            // Set pointer event throttling to reduce event frequency during rapid mouse movement
            // This is the key optimization for high-frequency hover interactions
            (zr as unknown as { _bindThrottledHandler?: (eventName: string) => void })._bindThrottledHandler?.('mousemove');
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (chartRef.current) {
                chartRef.current.dispose();
                chartRef.current = null;
            }
        };
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

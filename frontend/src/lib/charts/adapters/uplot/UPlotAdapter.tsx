/**
 * uPlot Adapter Component
 *
 * React component that renders a uPlot chart from a ChartConfig.
 * Handles lifecycle management, responsive sizing, and theme updates.
 */

import { useMemo, memo, useRef, useEffect, useLayoutEffect, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { ChartRendererProps } from '../../types';
import { buildUPlotOptions } from './optionBuilder';
import { buildUPlotData } from './dataBuilder';

/** Default chart height if not specified in config */
const DEFAULT_HEIGHT = 280;

/**
 * uPlot adapter component.
 * Converts library-agnostic ChartConfig to uPlot and renders.
 */
function UPlotAdapterInner({
    config,
    className,
    style,
}: ChartRendererProps): JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<uPlot | null>(null);
    const [containerWidth, setContainerWidth] = useState(800);

    // Build uPlot data from config
    const data = useMemo(() => buildUPlotData(config), [config]);

    // Build uPlot options from config
    const options = useMemo(
        () => buildUPlotOptions(config, containerWidth),
        [config, containerWidth]
    );

    // Handle responsive sizing with ResizeObserver
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            const { width } = entry.contentRect;
            if (width > 0) {
                setContainerWidth(width);
            }
        });

        resizeObserver.observe(containerRef.current);

        // Get initial width
        const initialWidth = containerRef.current.getBoundingClientRect().width;
        if (initialWidth > 0) {
            setContainerWidth(initialWidth);
        }

        return () => resizeObserver.disconnect();
    }, []);

    // Update chart size when container width changes
    useEffect(() => {
        if (chartRef.current && containerWidth > 0) {
            chartRef.current.setSize({
                width: containerWidth,
                height: config.height ?? DEFAULT_HEIGHT,
            });
        }
    }, [containerWidth, config.height]);

    // Mount/unmount chart
    useLayoutEffect(() => {
        if (!containerRef.current || containerWidth <= 0) return;

        // Destroy existing chart if any
        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }

        // Create new chart instance
        try {
            chartRef.current = new uPlot(options, data, containerRef.current);
        } catch (err) {
            console.error('uPlot initialization error:', err);
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [options, data, containerWidth]);

    // Merge height into container style
    const containerStyle = useMemo(
        () => ({
            height: `${config.height ?? DEFAULT_HEIGHT}px`,
            width: '100%',
            ...style,
        }),
        [config.height, style]
    );

    return (
        <div
            ref={containerRef}
            className={className}
            style={containerStyle}
        />
    );
}

/**
 * Memoized uPlot adapter to prevent unnecessary re-renders.
 */
export const UPlotAdapter = memo(UPlotAdapterInner);

/**
 * UPlot Chart Component
 *
 * Minimal React wrapper that delegates ALL chart management to the registry.
 * The chart lifecycle is completely independent of React's rendering cycle.
 *
 * How it works:
 * 1. React renders a container div with a ref
 * 2. On mount, we call into the registry to get/create a chart
 * 3. On config change, we call the registry to update the chart
 * 4. The registry manages all chart state independently
 * 5. React StrictMode double-mounting doesn't affect us because the registry
 *    uses data-chart-id to track existing charts
 */

import { useEffect, useRef, useLayoutEffect } from 'react';
import type { ChartConfig } from './types';
import { getOrCreateChart, updateChart, destroyChart, hasChart } from './chartRegistry';

export interface UPlotChartProps {
    config: ChartConfig;
    /** Additional CSS class */
    className?: string;
    /** Callback when series visibility changes */
    onSeriesToggle?: (seriesId: string, visible: boolean) => void;
}

export function UPlotChart({
    config,
    className,
    onSeriesToggle,
}: UPlotChartProps): JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);

    // Use layoutEffect to ensure DOM is ready before we access it
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Check if chart already exists (handles StrictMode double-mount)
        if (!hasChart(container)) {
            console.log('[UPlotChart] Initializing chart via registry');
            getOrCreateChart(container, { onSeriesToggle });
        }

        initializedRef.current = true;

        // Cleanup only on actual unmount (not StrictMode re-run)
        return () => {
            // Delay destruction slightly to handle StrictMode
            // If React immediately re-mounts, the chart will still exist
            setTimeout(() => {
                if (container && !document.body.contains(container)) {
                    console.log('[UPlotChart] Container removed from DOM, destroying chart');
                    destroyChart(container);
                }
            }, 0);
        };
    }, [onSeriesToggle]);

    // Update config when it changes
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !initializedRef.current) return;

        updateChart(container, config);
    }, [config]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ width: '100%', minHeight: config.height }}
        />
    );
}

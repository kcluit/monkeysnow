/**
 * UPlot Chart Component
 *
 * Thin React wrapper around ChartManager.
 * All uPlot lifecycle management is handled by ChartManager (vanilla JS).
 */

import { useEffect, useRef } from 'react';
import type { ChartConfig } from './types';
import { ChartManager } from './ChartManager';

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
    const managerRef = useRef<ChartManager | null>(null);

    // Initialize ChartManager on mount
    useEffect(() => {
        if (!containerRef.current) return;

        console.log('[UPlotChart] Creating ChartManager');
        managerRef.current = new ChartManager(containerRef.current, {
            onSeriesToggle,
        });

        // Cleanup on unmount
        return () => {
            console.log('[UPlotChart] Destroying ChartManager');
            managerRef.current?.destroy();
            managerRef.current = null;
        };
    }, []); // Only run on mount/unmount

    // Update config when it changes
    useEffect(() => {
        if (managerRef.current) {
            managerRef.current.setConfig(config);
        }
    }, [config]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ width: '100%', minHeight: config.height }}
        />
    );
}

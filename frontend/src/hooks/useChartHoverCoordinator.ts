/**
 * Chart Hover Coordinator Hook
 *
 * Optimizes performance when multiple ECharts instances are on the page by:
 * 1. Using CSS pointer-events to disable mouse interaction on non-hovered charts
 * 2. Only the chart container being hovered will process mouse events
 *
 * This dramatically improves FPS during rapid mouse movement because only ONE
 * chart processes events at a time instead of ALL charts.
 */

import { useEffect, useRef, useCallback } from 'react';

// Global state to track which container is currently active
let activeContainerId: string | null = null;
let coordinatorEnabled = true;

/**
 * Enable or disable the hover coordinator globally.
 * Useful for debugging or when you want all charts to be interactive.
 */
export function setCoordinatorEnabled(enabled: boolean): void {
    coordinatorEnabled = enabled;
    if (!enabled) {
        // Re-enable pointer events on all containers
        document.querySelectorAll('[data-chart-container]').forEach((el) => {
            (el as HTMLElement).style.pointerEvents = '';
        });
    }
}

/**
 * Hook to coordinate hover behavior across multiple chart containers.
 * Each chart should use this hook and wrap its ChartRenderer in a div with
 * the provided ref.
 *
 * @param chartId - Unique identifier for this chart
 * @returns containerRef - Ref to attach to the chart's wrapper div
 */
export function useChartHoverCoordinator(chartId: string) {
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = useCallback(() => {
        if (!coordinatorEnabled) return;

        activeContainerId = chartId;

        // Enable pointer events only on this container
        if (containerRef.current) {
            containerRef.current.style.pointerEvents = 'auto';
        }

        // Disable pointer events on all other chart containers
        document.querySelectorAll('[data-chart-container]').forEach((el) => {
            const element = el as HTMLElement;
            if (element.dataset.chartId !== chartId) {
                element.style.pointerEvents = 'none';
            }
        });
    }, [chartId]);

    const handleMouseLeave = useCallback(() => {
        if (!coordinatorEnabled) return;

        // Only clear if we're still the active container
        if (activeContainerId === chartId) {
            activeContainerId = null;

            // Re-enable pointer events on all containers when mouse leaves
            document.querySelectorAll('[data-chart-container]').forEach((el) => {
                (el as HTMLElement).style.pointerEvents = '';
            });
        }
    }, [chartId]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Mark this as a chart container
        container.dataset.chartContainer = 'true';
        container.dataset.chartId = chartId;

        // Add event listeners
        container.addEventListener('mouseenter', handleMouseEnter);
        container.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            container.removeEventListener('mouseenter', handleMouseEnter);
            container.removeEventListener('mouseleave', handleMouseLeave);
            delete container.dataset.chartContainer;
            delete container.dataset.chartId;
        };
    }, [chartId, handleMouseEnter, handleMouseLeave]);

    return { containerRef };
}

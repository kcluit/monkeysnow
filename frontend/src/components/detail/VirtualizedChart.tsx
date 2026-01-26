/**
 * Virtualized Chart Wrapper
 *
 * Only renders the actual chart when it's visible in the viewport.
 * Shows a placeholder skeleton when out of view.
 * This dramatically improves performance when many charts are on the page.
 */

import { memo, type ReactNode } from 'react';
import { useInViewport } from '../../hooks/useInViewport';

interface VirtualizedChartProps {
    /** Unique ID for the chart (used for keys and debugging) */
    chartId: string;
    /** The chart element to render when visible */
    children: ReactNode;
    /** Height of the placeholder when not visible (default: 420px to match chart height) */
    placeholderHeight?: number;
}

/**
 * Placeholder skeleton shown when chart is not in viewport.
 * Matches the approximate layout of a real chart.
 */
function ChartPlaceholder({ height }: { height: number }): JSX.Element {
    return (
        <div
            className="animate-pulse bg-theme-cardBg rounded-lg"
            style={{ height: `${height}px` }}
        >
            {/* Header placeholder */}
            <div className="flex items-center justify-between p-4 border-b border-theme-border">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-theme-border" />
                    <div className="h-4 w-24 bg-theme-border rounded" />
                    <div className="h-3 w-12 bg-theme-border rounded" />
                </div>
            </div>
            {/* Chart area placeholder */}
            <div className="p-4 flex items-center justify-center" style={{ height: `${height - 60}px` }}>
                <div className="text-theme-textSecondary text-sm opacity-50">
                    Loading chart...
                </div>
            </div>
        </div>
    );
}

/**
 * Virtualized chart wrapper.
 * Uses IntersectionObserver to only render charts when visible.
 * Once a chart has been seen, it stays rendered (once: true).
 */
function VirtualizedChartInner({
    chartId,
    children,
    placeholderHeight = 420,
}: VirtualizedChartProps): JSX.Element {
    // Track visibility with generous margin (200px above and below viewport)
    // Once visible, stay mounted to avoid re-initialization on scroll
    const [ref, isVisible] = useInViewport<HTMLDivElement>({
        rootMargin: '200px',
        threshold: 0,
        once: true, // Keep mounted once seen
    });

    return (
        <div ref={ref} data-chart-id={chartId}>
            {isVisible ? (
                children
            ) : (
                <ChartPlaceholder height={placeholderHeight} />
            )}
        </div>
    );
}

export const VirtualizedChart = memo(VirtualizedChartInner);

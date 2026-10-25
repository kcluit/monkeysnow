import { useEffect, useMemo, useRef } from 'react';
import { webcamUrls } from '../../utils/constants';
import { nightsBetween } from '../../utils/nightTimes';
import { useInViewport } from '../../hooks/useInViewport';
import { useLanguage } from '../../hooks/useLanguage';
import { HistoryBadge } from '../cards/HistoryBadge';
import { totalsText } from '../cards/cardUtils';
import { graphDataOf } from './graphData';
import { GraphTimeAxis } from './graphTimeAxis';
import { GraphPlot } from './GraphPlot';
import type { GraphSync } from './graphSync';
import type { XRange } from '../../lib/charts/plugins';
import type { ChartTheme } from '../../lib/charts';
import type { ElevationLevel, ProcessedResortData, ResortData, SnowCaution, SnowfallEstimateMode, UnitSystem } from '../../types';

/** The time axis under the plot, and the space above it */
const AXIS_HEIGHT = 34;

interface GraphCardProps {
    resort: ProcessedResortData;
    data: ResortData;
    elevation: ElevationLevel;
    snowfallMode: SnowfallEstimateMode;
    snowCaution: SnowCaution;
    units: UnitSystem;
    theme: ChartTheme;
    sync: GraphSync;
    /** Every hour any Graph on the page has */
    bounds: XRange;
    plotHeight: number;
    onResortClick?: (resortId: string) => void;
}

/**
 * One Graph: the card's header, which opens the Detailed view, over the plot. The plot
 * is only drawn while the card is on or near the screen, since hundreds of chart
 * canvases at once would use too much memory.
 */
export function GraphCard({ resort, data, elevation, snowfallMode, snowCaution, units, theme, sync, bounds, plotHeight, onResortClick }: GraphCardProps): JSX.Element {
    const { t, language } = useLanguage();
    const [cardRef, isNearScreen] = useInViewport<HTMLDivElement>({ rootMargin: '600px 0px' });
    const plotRef = useRef<HTMLDivElement>(null);
    const webcamUrl = webcamUrls[resort.id];

    const graphData = useMemo(
        () => graphDataOf(data, elevation, snowfallMode, snowCaution, units),
        [data, elevation, snowfallMode, snowCaution, units]
    );
    const axis = useMemo(
        () => graphData && graphData.times.length > 0
            ? new GraphTimeAxis(bounds.min, bounds.max, graphData.times[0], graphData.timeZone, language.locale)
            : null,
        [graphData, bounds, language.locale]
    );
    const nights = useMemo(
        () => graphData ? nightsBetween(bounds.min, bounds.max, graphData.lat, graphData.lon) : [],
        [graphData, bounds]
    );

    useEffect(() => {
        const container = plotRef.current;
        if (!isNearScreen || !graphData || !axis || !container) return;
        // Built again in a new language, since its labels and tooltip are drawn with t
        const plot = new GraphPlot(container, { data: graphData, axis, nights, theme, units, width: container.clientWidth, plotHeight, sync, t });
        const observer = new ResizeObserver(() => plot.setWidth(container.clientWidth));
        observer.observe(container);
        return () => {
            observer.disconnect();
            plot.destroy();
        };
    }, [isNearScreen, graphData, axis, nights, theme, units, plotHeight, sync, t]);

    return (
        <div ref={cardRef} className="resort-card rounded-2xl p-3 sm:p-4 shadow-lg mb-6 backdrop-blur-md">
            <div
                className={`mb-2 flex flex-wrap justify-between items-center gap-x-4 gap-y-1 ${onResortClick ? 'cursor-pointer' : ''}`}
                onClick={() => onResortClick?.(resort.id)}
            >
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h2 className="text-xl font-semibold text-theme-textPrimary tracking-tight">{resort.name}</h2>
                        {resort.isHistory && <HistoryBadge days={resort.days.length} />}
                    </div>
                    <p className="text-xs text-theme-accent">
                        {resort.elevation}
                        <span className="text-theme-textSecondary"> · {resort.model}</span>
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-medium">
                        <span className="text-theme-accent">{t('card.totals')}</span>
                        <span className="text-theme-textPrimary"> {totalsText(resort, units)}</span>
                    </span>
                    {webcamUrl && (
                        <a
                            href={webcamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-theme-secondary transition-colors" style={{ backgroundColor: 'var(--cardBg)' }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-theme-accent">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                            </svg>
                            <span className="text-sm font-medium text-theme-accent">{t('card.webcams')}</span>
                        </a>
                    )}
                </div>
            </div>
            {graphData ? (
                <div ref={plotRef} className="graph-plot" style={{ height: plotHeight + AXIS_HEIGHT }} />
            ) : (
                // A forecast cached before hours were kept, waiting to be fetched again
                <div className="flex items-center justify-center text-sm text-theme-textSecondary" style={{ height: plotHeight + AXIS_HEIGHT }}>
                    {t('graph.loadingHours')}
                </div>
            )}
        </div>
    );
}

import { useLayoutEffect, useMemo, useState } from 'react';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useLanguage } from '../../hooks/useLanguage';
import { SNOW_QUALITIES } from '../../utils/resortForecast';
import { SNOW_QUALITY_COLOURS, SNOW_QUALITY_NAMES } from '../../utils/snowQualityColours';
import { GraphCard } from './GraphCard';
import { GraphSync } from './graphSync';
import { NIGHT_OPACITY, TEMPERATURE_COLOUR } from './GraphPlot';
import type { XRange } from '../../lib/charts/plugins';
import type { AllWeatherData, ElevationLevel, ProcessedResortData, SnowfallEstimateMode, UnitSystem } from '../../types';

interface GraphViewProps {
    resorts: ProcessedResortData[];
    allWeatherData: AllWeatherData;
    elevation: ElevationLevel;
    snowfallMode: SnowfallEstimateMode;
    units: UnitSystem;
    onResortClick?: (resortId: string) => void;
}

/** Every hour any of these forecasts has, or null while none has hours */
function boundsOf(resorts: ProcessedResortData[], allWeatherData: AllWeatherData, elevation: ElevationLevel): XRange | null {
    let min = Infinity;
    let max = -Infinity;
    for (const resort of resorts) {
        const hours = allWeatherData.data[resort.id]?.[elevation].hours;
        if (!hours || hours.temperature.length === 0) continue;
        min = Math.min(min, hours.start);
        max = Math.max(max, hours.start + (hours.temperature.length - 1) * hours.interval);
    }
    return Number.isFinite(min) ? { min, max } : null;
}

/**
 * Graph view: the Main page with a Graph for each card, all showing the same stretch
 * of time, under one key that explains them.
 */
export function GraphView({ resorts, allWeatherData, elevation, snowfallMode, units, onResortClick }: GraphViewProps): JSX.Element {
    const theme = useChartTheme();
    const isMobile = useIsMobile();
    // One per visit to the page, so coming back opens on the next 5 days again
    const [sync] = useState(() => new GraphSync());

    const latest = boundsOf(resorts, allWeatherData, elevation);
    // The same object while the hours don't change, so Graphs don't rebuild their axes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const bounds = useMemo(() => latest, [latest?.min, latest?.max]);

    // Before the Graphs' own effects build their plots, which open on the shared window
    useLayoutEffect(() => {
        if (bounds) sync.setBounds(bounds);
    }, [bounds, sync]);

    return (
        <>
            <GraphKey units={units} />
            {resorts.map((resort) => (
                <div key={resort.id}>
                    <GraphCard
                        resort={resort}
                        data={allWeatherData.data[resort.id]}
                        elevation={elevation}
                        snowfallMode={snowfallMode}
                        units={units}
                        theme={theme}
                        sync={sync}
                        bounds={bounds ?? { min: 0, max: 0 }}
                        plotHeight={isMobile ? 170 : 200}
                        onResortClick={onResortClick}
                    />
                </div>
            ))}
        </>
    );
}

/** One row under the utility bar explaining every Graph's colours and lines */
function GraphKey({ units }: { units: UnitSystem }): JSX.Element {
    const { t } = useLanguage();
    const line = (colour: string, dashed = false) => (
        <span className="inline-block w-4 align-middle" style={{ borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${colour}` }} />
    );
    return (
        <div className="graph-key flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs text-theme-textSecondary">
            {[...SNOW_QUALITIES].reverse().map((quality) => (
                <span key={quality} className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SNOW_QUALITY_COLOURS[quality] }} />
                    {SNOW_QUALITY_NAMES[quality]}
                </span>
            ))}
            <span>{t(units === 'imperial' ? 'graph.precipitationInches' : 'graph.precipitationMetric')}</span>
            <span className="inline-flex items-center gap-1.5">{line(TEMPERATURE_COLOUR)}{t('graph.temperature')}</span>
            <span className="inline-flex items-center gap-1.5">{line('var(--textSecondary)')}{t('graph.freezingLevel')}</span>
            <span className="inline-flex items-center gap-1.5">{line('var(--textSecondary)', true)}{t('graph.elevationBands')}</span>
            <span className="inline-flex items-center gap-1.5">
                <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{
                        backgroundColor: `color-mix(in srgb, var(--textSecondary) ${NIGHT_OPACITY * 100}%, transparent)`,
                        border: '1px solid color-mix(in srgb, var(--textSecondary) 30%, transparent)',
                    }}
                />
                {t('graph.night')}
            </span>
            <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 align-middle" style={{ borderLeft: '2px solid var(--accent)' }} />
                {t('graph.now')}
            </span>
        </div>
    );
}

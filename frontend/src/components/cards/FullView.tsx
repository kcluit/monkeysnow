import { useRef, useState, useEffect, useLayoutEffect, useCallback, type ReactNode } from 'react';
import { getSnowConditionFromQuality } from '../../utils/weather';
import { showsRain, showsSnow } from '../../utils/unitConversion';
import { getTemperatureStyle, getWindClass, periodName, shortWeatherText, totalsText } from './cardUtils';
import { HistoryBadge } from './HistoryBadge';
import { isSavedLocationId } from '../../utils/savedLocations';
import { useLanguage } from '../../hooks/useLanguage';
import { formatLocale } from '../../locales';
import type { CardProps, DayForecast, Period } from '../../types';

const PERIODS = ['AM', 'PM', 'Night'] as const;

// Not the theme's --border: "Hide borders" (on by default) makes that transparent, and days need dividing
const dividerColor = { borderColor: 'color-mix(in srgb, var(--textSecondary) 25%, transparent)' };

const zero = <span className="text-theme-textSecondary opacity-40">–</span>;

/** "0.2 cm" as the number with its unit small and faded beside it */
function withUnit(formatted: string): ReactNode {
    const [value, unit] = formatted.split(' ');
    return <span className="whitespace-nowrap">{value}<span className="text-[10px] sm:text-[11px] font-medium opacity-70 ml-px">{unit}</span></span>;
}

interface Row {
    label: string;
    tall?: boolean;
    cell: (period: Period) => ReactNode;
}

// A Period's width by how many of its day's three columns it fills
const PERIOD_WIDTH: Record<number, string> = {
    1: 'w-14 min-w-[3.5rem] max-w-[3.5rem] sm:w-[4.25rem] sm:min-w-[4.25rem] sm:max-w-[4.25rem]',
    2: 'w-28 min-w-[7rem] max-w-[7rem] sm:w-[8.5rem] sm:min-w-[8.5rem] sm:max-w-[8.5rem]',
    3: 'w-[10.5rem] min-w-[10.5rem] max-w-[10.5rem] sm:w-[12.75rem] sm:min-w-[12.75rem] sm:max-w-[12.75rem]',
};

/**
 * The day's Periods with how many columns each fills. Where the Card model's Range ends
 * partway through a day, the Periods it has stretch over the ones it doesn't.
 */
function periodColumns(day: DayForecast): { period: Period; span: number }[] {
    const present = PERIODS.flatMap((time, column) => {
        const period = day.periods.find(p => p.time === time);
        return period ? [{ period, column }] : [];
    });
    return present.map(({ period, column }, index) => ({
        period,
        span: (present[index + 1]?.column ?? PERIODS.length) - (index === 0 ? 0 : column),
    }));
}

export function FullView({ resort, temperatureMetric: _temperatureMetric = 'max', showDate = false, unitSystem = 'metric', onResortClick, selectedElevation = 'bot' }: CardProps): JSX.Element {
    const { t } = useLanguage();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const tolerance = 1;
        setCanScrollLeft(el.scrollLeft > tolerance);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - tolerance);
    }, []);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        updateScrollState();
        el.addEventListener('scroll', updateScrollState);
        const observer = new ResizeObserver(updateScrollState);
        observer.observe(el);
        return () => {
            el.removeEventListener('scroll', updateScrollState);
            observer.disconnect();
        };
    }, [updateScrollState]);

    // History's latest days are on the right, so it opens scrolled to them
    useLayoutEffect(() => {
        const el = scrollContainerRef.current;
        if (el) el.scrollLeft = resort.isHistory ? el.scrollWidth : 0;
    }, [resort.isHistory, resort.days.length]);

    // One day's three columns on a wide screen
    const scrollByDay = (direction: 1 | -1): void => {
        scrollContainerRef.current?.scrollBy({ left: direction * 204, behavior: 'smooth' });
    };

    // A Saved location has one elevation, whichever band is selected
    const elevationLabel = isSavedLocationId(resort.id) ? ''
        : `${t(selectedElevation === 'bot' ? 'band.base' : selectedElevation === 'mid' ? 'band.mid' : 'band.top')} `;

    const rows: Row[] = [
        {
            label: unitSystem === 'imperial' ? '°F' : '°C',
            cell: period => {
                const tempStyle = getTemperatureStyle(period.tempMax);
                return <span className={`font-bold ${tempStyle.className || ''}`} style={tempStyle.style}>{period.temp.replace(/°[CF]$/, '°')}</span>;
            },
        },
        {
            label: t('card.row.snow'),
            cell: period => {
                if (!showsSnow(period.snowCm, unitSystem)) return zero;
                const snowStyle = period.snowCm >= 5 ? {
                    background: 'var(--specialColor)',
                    WebkitBackgroundClip: 'text' as const,
                    backgroundClip: 'text' as const,
                    color: 'transparent'
                } : {
                    color: 'var(--accent)'
                };
                return <span className="font-bold" style={snowStyle}>{withUnit(period.snow)}</span>;
            },
        },
        {
            label: t('card.row.rain'),
            cell: period => showsRain(period.rainMm, unitSystem)
                ? <span className="font-semibold text-theme-textSecondary">{withUnit(period.rain)}</span>
                : zero,
        },
        {
            label: t('card.row.wind'),
            cell: period => <span className={`font-semibold ${getWindClass(period.windKmh)}`}>{withUnit(period.wind)}</span>,
        },
        {
            label: t('card.row.weather'),
            tall: true,
            cell: period => (
                <span className="block mx-auto w-12 sm:w-16 text-[11px] sm:text-[13px] leading-tight font-medium text-theme-textSecondary line-clamp-2" title={period.condition}>
                    {shortWeatherText(period.weatherCode)}
                </span>
            ),
        },
        {
            label: t('term.freezingLevel'),
            // formatFreezingLevel gives "- m" when the model has none
            cell: period => period.freezingLevel.startsWith('-')
                ? null
                : <span className="font-medium text-theme-textSecondary">{withUnit(period.freezingLevel)}</span>,
        },
        {
            label: t('term.snowQuality'),
            cell: period => {
                if (!period.snowQuality || (!showsSnow(period.snowCm, unitSystem) && !showsRain(period.rainMm, unitSystem))) return zero;
                const quality = getSnowConditionFromQuality(period.snowQuality);
                return <span className={`text-[11px] sm:text-xs font-semibold whitespace-nowrap ${quality.isHighlight ? 'special-color-text' : 'text-theme-accent'}`}>{quality.text}</span>;
            },
        },
    ];

    // On phones the label column is narrow, so "Freezing level" and "Snow quality" wrap onto two lines
    const labelCell = 'text-left pr-2 w-[3.4rem] min-w-[3.4rem] max-w-[3.4rem] leading-tight sm:w-auto sm:max-w-none sm:whitespace-nowrap text-[11px] sm:text-sm font-semibold text-theme-textSecondary';
    const dayStart = (index: number): string => index === 0 ? 'border-l' : '';

    return (
        <div
            className={`resort-card rounded-2xl p-3 sm:p-5 shadow-lg mb-6 transition-all duration-300 ${onResortClick ? "cursor-pointer" : ""}`}
            onClick={() => onResortClick?.(resort.id)}
        >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 mb-2">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-theme-textPrimary">{resort.name}</h2>
                    {resort.isHistory && <HistoryBadge days={resort.days.length} />}
                    <span className="text-xs sm:text-sm text-theme-textSecondary">
                        <span className="text-theme-accent font-medium">{elevationLabel}{resort.elevation}</span>
                        {' · '}{resort.model}
                        {resort.fetchedAt !== undefined && (
                            <span title={t('card.lastUpdated')}> · {new Date(resort.fetchedAt).toLocaleTimeString(formatLocale(), { hour: 'numeric', minute: '2-digit' })}</span>
                        )}
                    </span>
                </div>
                <div className="text-xs sm:text-sm font-medium">
                    <span className="text-theme-accent">{t('card.totals')}</span>
                    <span className="text-theme-textPrimary"> {totalsText(resort, unitSystem)}</span>
                </div>
            </div>

            <div className="relative">
                <button
                    onClick={(e) => { e.stopPropagation(); scrollByDay(-1); }}
                    className={`absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-theme-cardBg rounded-full p-2 shadow-lg hover:bg-theme-secondary transition-all duration-300 text-theme-textPrimary ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); scrollByDay(1); }}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-theme-cardBg rounded-full p-2 shadow-lg hover:bg-theme-secondary transition-all duration-300 text-theme-textPrimary ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </button>

                <div ref={scrollContainerRef} className="scroll-container overflow-x-auto hide-scrollbar">
                    <table className="border-separate border-spacing-0 text-center text-sm sm:text-base">
                        <thead>
                            <tr>
                                <th className={labelCell} />
                                {resort.days.map((day, dayIndex) => (
                                    <th key={dayIndex} colSpan={3} style={dividerColor} className="border-l px-1 pb-0.5 text-xs sm:text-base font-bold text-theme-textPrimary whitespace-nowrap">
                                        {day.name}{showDate && <span className="font-normal text-theme-textSecondary"> {day.date}</span>} <span className="font-normal">{day.weatherEmoji}</span>
                                    </th>
                                ))}
                            </tr>
                            <tr>
                                <th className={labelCell} />
                                {resort.days.flatMap((day, dayIndex) => periodColumns(day).map(({ period, span }, index) => (
                                    <th key={`${dayIndex}-${period.time}`} colSpan={span} style={dividerColor} className={`${PERIOD_WIDTH[span]} ${dayStart(index)} pb-1 text-[11px] sm:text-xs font-semibold text-theme-textSecondary`}>{periodName(period.time)}</th>
                                )))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => (
                                <tr key={row.label}>
                                    <th scope="row" className={labelCell}>{row.label}</th>
                                    {resort.days.flatMap((day, dayIndex) => periodColumns(day).map(({ period, span }, index) => (
                                        <td key={`${dayIndex}-${period.time}`} colSpan={span} style={dividerColor} className={`${PERIOD_WIDTH[span]} ${dayStart(index)} px-0.5 ${row.tall ? 'h-9 sm:h-10' : 'py-[3px] sm:py-1'}`}>
                                            {row.cell(period)}
                                        </td>
                                    )))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

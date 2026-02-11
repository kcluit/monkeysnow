import { useRef, useState, useEffect, useCallback, MouseEvent } from 'react';
import { webcamUrls } from '../../utils/constants';
import { calculateSnowTotals } from '../../utils/weather';
import { calculateDayStats, formatWeatherText, getTemperatureStyle, getSnowClass, getWindClass } from './cardUtils';
import { formatTemp, formatSnow, formatRain, formatWind } from '../../utils/unitConversion';
import type { CardProps } from '../../types';

export function DefaultCard({ resort, temperatureMetric = 'max', showDate = false, unitSystem = 'metric', onResortClick }: CardProps): JSX.Element {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [seymourClicks, setSeymourClicks] = useState(0);
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

    const webcamUrl = webcamUrls[resort.name];
    const totals = calculateSnowTotals(resort);

    const handleSeymourClick = (event: MouseEvent<HTMLAnchorElement>): void => {
        if (resort.name === "Mount Seymour") {
            const newClicks = seymourClicks + 1;
            setSeymourClicks(newClicks);

            if (newClicks >= 3) {
                event.preventDefault();
                window.location.href = "https://www.youtube.com/watch?v=CSD2J8yaMmM";
            }
        }
    };

    const scrollLeft = (): void => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
        }
    };

    const scrollRight = (): void => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
        }
    };

    return (
        <div
            className={`resort-card rounded-2xl p-4 shadow-lg mb-6 backdrop-blur-md ${onResortClick ? "cursor-pointer" : ""}`}
            onClick={() => onResortClick?.(resort.id)}
        >
            <div className="mb-3 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-theme-textPrimary tracking-tight">{resort.name}</h2>
                    <p className="text-xs text-theme-accent">{resort.elevation}</p>
                </div>
                {webcamUrl && (
                    <a
                        href={webcamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-theme-secondary transition-colors" style={{ backgroundColor: 'var(--cardBg)' }}
                        onClick={(event) => { event.stopPropagation(); handleSeymourClick(event); }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-theme-accent">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                        </svg>
                        <span className="text-sm font-medium text-theme-accent">Webcams</span>
                    </a>
                )}
            </div>
            <div className="relative">
                <button
                    onClick={(e) => { e.stopPropagation(); scrollLeft(); }}
                    className={`absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-theme-cardBg rounded-full p-2 shadow-lg hover:bg-theme-secondary transition-all duration-300 text-theme-textPrimary ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); scrollRight(); }}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-theme-cardBg rounded-full p-2 shadow-lg hover:bg-theme-secondary transition-all duration-300 text-theme-textPrimary ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
                <div ref={scrollContainerRef} className="scroll-container overflow-x-auto hide-scrollbar">
                    <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
                        {resort.days.map((day, dayIndex) => {
                            const dayStats = calculateDayStats(day, temperatureMetric);
                            const weatherText = formatWeatherText(day.periods);
                            return (
                                <div key={dayIndex} className="w-[180px]">
                                    <div className="flex items-center gap-1 mb-1">
                                        <h3 className="text-sm font-semibold text-theme-textPrimary tracking-tight">
                                            {day.name}{showDate && <span className="text-theme-textSecondary font-normal"> {day.date}</span>}
                                        </h3>
                                        <span className="text-lg">{day.weatherEmoji}</span>
                                    </div>
                                    <div className="rounded-xl p-3 backdrop-blur-sm" style={{ backgroundColor: 'var(--secondary)' }}>
                                        <div className="flex items-center gap-2">
                                            {(() => {
                                                const tempStyle = getTemperatureStyle(dayStats.maxTemp);
                                                return (
                                                    <div
                                                        className={`text-2xl font-bold ${tempStyle.className || ''}`}
                                                        style={tempStyle.style}
                                                    >
                                                        {formatTemp(dayStats.maxTemp, unitSystem)}
                                                    </div>
                                                );
                                            })()}
                                            {dayStats.snow > 0 ? (
                                                <div className={`text-sm font-bold ${getSnowClass(dayStats.snow, unitSystem)}`}>
                                                    {formatSnow(dayStats.snow, unitSystem)} snow
                                                </div>
                                            ) : dayStats.rain > 0 ? (
                                                <div className="text-sm font-bold text-theme-textSecondary">
                                                    {formatRain(dayStats.rain, unitSystem)} rain
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="text-sm text-theme-textPrimary mt-1 font-medium truncate" title={weatherText}>{weatherText}</div>
                                        <div className={`text-xs font-medium ${getWindClass(dayStats.wind, unitSystem)} mt-1`}>
                                            {formatWind(dayStats.wind, unitSystem)} wind
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-theme-border">
                                            <div className="text-xs text-theme-textPrimary font-medium">
                                                Freezing: {day.freezingLevel}
                                            </div>
                                            <div className={`text-xs font-medium mt-0.5 truncate ${day.snowCondition.isRainbow ? 'apple-rainbow-text' : day.snowCondition.isSecondary ? 'text-theme-textSecondary' : 'text-theme-accent'}`} title={day.snowCondition.text}>
                                                {day.snowCondition.text}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="mt-2">
                <div className="flex justify-center">
                    <div className="bg-theme-cardBg px-3 py-1 rounded-lg">
                        <span className="text-sm font-medium">
                            <span className="text-theme-accent">Totals:</span>
                            <span className="text-theme-textPrimary"> Next 3 Days: {formatSnow(totals.next3Days, unitSystem)} | Next 7 Days: {formatSnow(totals.next7Days, unitSystem)}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

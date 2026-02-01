import { useRef, useState, MouseEvent } from 'react';
import { webcamUrls } from '../../utils/constants';
import { calculateDayStats, formatWeatherText, getTemperatureStyle, getSnowClass, getWindClass } from './cardUtils';
import { formatTemp, formatSnow, formatWind } from '../../utils/unitConversion';
import type { CardProps } from '../../types';

export function CompactCard({ resort, temperatureMetric = 'max', showDate = false, unitSystem = 'metric', onResortClick }: CardProps): JSX.Element {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [seymourClicks, setSeymourClicks] = useState(0);

    const webcamUrl = webcamUrls[resort.name];

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
            scrollContainerRef.current.scrollBy({ left: -180, behavior: 'smooth' });
        }
    };

    const scrollRight = (): void => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 180, behavior: 'smooth' });
        }
    };

    return (
        <div
            className={`resort-card rounded-xl p-3 shadow-md backdrop-blur-md ${onResortClick ? "cursor-pointer" : ""}`}
            onClick={() => onResortClick?.(resort.id)}
        >
            {/* Compact Header */}
            <div className="mb-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-theme-textPrimary tracking-tight">{resort.name}</h2>
                    <span className="text-xs text-theme-accent">{resort.elevation}</span>
                </div>
                {webcamUrl && (
                    <a
                        href={webcamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-theme-secondary transition-colors"
                        style={{ backgroundColor: 'var(--cardBg)' }}
                        onClick={(event) => { event.stopPropagation(); handleSeymourClick(event); }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-theme-accent">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                        </svg>
                    </a>
                )}
            </div>

            {/* Compact Scroll Container */}
            <div className="relative">
                <button
                    onClick={(e) => { e.stopPropagation(); scrollLeft(); }}
                    className="absolute left-0.5 top-1/2 -translate-y-1/2 z-10 bg-theme-cardBg rounded-full p-1 shadow-md hover:bg-theme-secondary transition-all text-theme-textPrimary opacity-70 hover:opacity-100"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
                <button
                    onClick={scrollRight}
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 bg-theme-cardBg rounded-full p-1 shadow-md hover:bg-theme-secondary transition-all text-theme-textPrimary opacity-70 hover:opacity-100"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </button>

                <div ref={scrollContainerRef} className="scroll-container overflow-x-auto hide-scrollbar px-1">
                    <div className="flex gap-1.5" style={{ width: 'max-content' }}>
                        {resort.days.map((day, dayIndex) => {
                            const dayStats = calculateDayStats(day, temperatureMetric);
                            const weatherText = formatWeatherText(day.periods);
                            return (
                                <div key={dayIndex} className="w-[130px]">
                                    {/* Day Header - More compact */}
                                    <div className="flex items-center justify-between mb-0.5 px-0.5">
                                        <span className="text-xs font-medium text-theme-textSecondary">
                                            {day.name}{showDate && ` ${day.date}`}
                                        </span>
                                        <span className="text-sm">{day.weatherEmoji}</span>
                                    </div>

                                    {/* Compact Day Card */}
                                    <div className="rounded-lg p-2 backdrop-blur-sm" style={{ backgroundColor: 'var(--secondary)' }}>
                                        {/* Temperature + Snow in row */}
                                        <div className="flex items-baseline justify-between">
                                            {(() => {
                                                const tempStyle = getTemperatureStyle(dayStats.maxTemp);
                                                return (
                                                    <span
                                                        className={`text-lg font-bold ${tempStyle.className || ''}`}
                                                        style={tempStyle.style}
                                                    >
                                                        {formatTemp(dayStats.maxTemp, unitSystem)}
                                                    </span>
                                                );
                                            })()}
                                            {dayStats.snow > 0 ? (
                                                <span className={`text-xs font-bold ${getSnowClass(dayStats.snow, unitSystem)}`}>
                                                    {formatSnow(dayStats.snow, unitSystem)}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-theme-textSecondary">--</span>
                                            )}
                                        </div>

                                        {/* Weather + Wind compact row */}
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-theme-textPrimary truncate max-w-[70px]" title={weatherText}>
                                                {weatherText.split('/')[0].trim()}
                                            </span>
                                            <span className={`text-xs font-medium ${getWindClass(dayStats.wind, unitSystem)}`}>
                                                {formatWind(dayStats.wind, unitSystem)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {/* No totals footer - compact mode */}
        </div>
    );
}

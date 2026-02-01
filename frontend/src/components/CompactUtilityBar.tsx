import { useState, useEffect } from 'react';
import type { UtilityBarProps, SortDay, ElevationLevel, SortOption, ViewMode } from '../types';
import { getSortDayData, getSortDayText } from '../utils/sortDayHelpers';

interface ExtendedCompactUtilityBarProps extends UtilityBarProps {
    openResortModal: () => void;
}

export function CompactUtilityBar({
    selectedResorts,
    selectedElevation,
    setSelectedElevation,
    selectedSort,
    setSelectedSort,
    selectedSortDay,
    setSelectedSortDay,
    viewMode,
    setViewMode,
    isReversed,
    setIsReversed,
    allWeatherData,
    processResortData,
    openResortModal
}: ExtendedCompactUtilityBarProps): JSX.Element {
    const [showSortDayMenu, setShowSortDayMenu] = useState(false);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent): void => {
            if (!(e.target as HTMLElement).closest('[data-dropdown]')) {
                setShowSortDayMenu(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const sortDayData = getSortDayData(selectedResorts, allWeatherData, processResortData, selectedElevation);

    // Cycle functions
    const cycleViewMode = (): void => {
        const modes: ViewMode[] = ['default', 'full', 'compact'];
        const currentIndex = modes.indexOf(viewMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        setViewMode(modes[nextIndex]);
    };

    const getViewModeText = (): string => {
        switch (viewMode) {
            case 'default': return 'Default';
            case 'full': return 'Full';
            case 'compact': return 'Compact';
        }
    };

    const cycleSort = (): void => {
        const sorts: SortOption[] = ['temperature', 'snowfall', 'wind'];
        const currentIndex = sorts.indexOf(selectedSort);
        const nextIndex = (currentIndex + 1) % sorts.length;
        setSelectedSort(sorts[nextIndex]);
    };

    const getSortText = (): string => {
        switch (selectedSort) {
            case 'temperature': return 'Temp';
            case 'snowfall': return 'Snow';
            case 'wind': return 'Wind';
        }
    };

    return (
        <div className="compact-utility-bar mb-8 flex justify-center">
            <div className="compact-utility-bar-inner inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-secondary">
                {/* Select Resorts */}
                <button
                    onClick={() => openResortModal()}
                    className="compact-bar-text text-theme-textSecondary hover:text-theme-textPrimary hover:font-bold transition-colors"
                >
                    Select Resorts ({selectedResorts.length})
                </button>

                <span className="compact-bar-separator">|</span>

                {/* Elevation - Three inline text options */}
                <div className="inline-flex items-center gap-2">
                    {(['bot', 'mid', 'top'] as ElevationLevel[]).map((level) => (
                        <button
                            key={level}
                            onClick={() => setSelectedElevation(level)}
                            className={`compact-bar-text transition-colors ${selectedElevation === level
                                ? 'text-theme-accent'
                                : 'text-theme-textSecondary hover:text-theme-textPrimary hover:font-bold'
                                }`}
                        >
                            {level === 'bot' ? 'Base' : level === 'mid' ? 'Mid' : 'Peak'}
                        </button>
                    ))}
                </div>

                <span className="compact-bar-separator">|</span>

                {/* View Mode - Cycle button */}
                <button
                    onClick={cycleViewMode}
                    className="compact-bar-text text-theme-textSecondary hover:text-theme-accent transition-colors"
                >
                    {getViewModeText()}
                </button>

                <span className="compact-bar-separator">|</span>

                {/* Sort Group: Sort: Snow · 3 Days · Ascending */}
                <div className="inline-flex items-center gap-2">
                    <span className="compact-bar-text text-theme-textSecondary">Sort:</span>

                    {/* Sort type - cycle button */}
                    <button
                        onClick={cycleSort}
                        className="compact-bar-text text-theme-textSecondary hover:text-theme-accent transition-colors"
                    >
                        {getSortText()}
                    </button>

                    <span className="compact-bar-text text-theme-textSecondary">·</span>

                    {/* Days dropdown */}
                    <div className="relative inline-block" data-dropdown>
                        <button
                            onClick={() => setShowSortDayMenu(!showSortDayMenu)}
                            className="compact-bar-text text-theme-textSecondary hover:text-theme-textPrimary hover:font-bold transition-colors inline-flex items-center gap-1"
                        >
                            {getSortDayText(selectedSortDay, sortDayData)}
                            <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        {showSortDayMenu && (
                            <div className="absolute left-0 z-10 mt-2 w-36 bg-theme-background rounded-lg shadow-lg border border-theme-border">
                                <div className="p-2 space-y-1">
                                    {/* Special aggregate options */}
                                    {sortDayData.specialOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setSelectedSortDay(option.value as SortDay);
                                                setShowSortDayMenu(false);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${selectedSortDay === option.value
                                                ? 'text-theme-accent font-medium'
                                                : 'hover:bg-theme-secondary text-theme-textPrimary'
                                                }`}
                                        >
                                            {option.name}
                                        </button>
                                    ))}

                                    {/* Separator */}
                                    {sortDayData.regularDays.length > 0 && (
                                        <div className="border-t border-theme-border my-1"></div>
                                    )}

                                    {/* Regular day options */}
                                    {sortDayData.regularDays.map((day, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setSelectedSortDay(index);
                                                setShowSortDayMenu(false);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${selectedSortDay === index
                                                ? 'text-theme-accent font-medium'
                                                : 'hover:bg-theme-secondary text-theme-textPrimary'
                                                }`}
                                        >
                                            {day.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <span className="compact-bar-text text-theme-textSecondary">·</span>

                    {/* Order Toggle */}
                    <button
                        onClick={() => setIsReversed(!isReversed)}
                        className="compact-bar-text text-theme-textSecondary hover:text-theme-accent transition-colors"
                    >
                        {isReversed ? 'Descending' : 'Ascending'}
                    </button>
                </div>
            </div>
        </div>
    );
}

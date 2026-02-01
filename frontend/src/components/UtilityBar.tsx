import { useState, useEffect } from 'react';
import type { UtilityBarProps, SortDay } from '../types';
import { getSortDayData, getSortDayText } from '../utils/sortDayHelpers';

interface ExtendedUtilityBarProps extends UtilityBarProps {
  openResortModal: () => void;
}

export function UtilityBar({
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
}: ExtendedUtilityBarProps): JSX.Element {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showSortDayMenu, setShowSortDayMenu] = useState(false);
  const [showViewModeMenu, setShowViewModeMenu] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (!(e.target as HTMLElement).closest('[data-dropdown]')) {
        setShowSortMenu(false);
        setShowSortDayMenu(false);
        setShowViewModeMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const elevationText = selectedElevation === 'bot' ? 'Base Forecast' :
                       selectedElevation === 'mid' ? 'Mid Forecast' : 'Peak Forecast';

  const sortDayData = getSortDayData(selectedResorts, allWeatherData, processResortData, selectedElevation);
  const sortDayText = getSortDayText(selectedSortDay, sortDayData);

  return (
    <div className="mb-8 flex flex-wrap gap-4 items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Resort Selection Button - Opens Modal */}
        <button
          onClick={() => {
            openResortModal();
            setShowElevationMenu(false);
            setShowSortMenu(false);
            setShowSortDayMenu(false);
            setShowViewModeMenu(false);
          }}
          className="w-full md:w-64 bg-theme-background border border-theme-border rounded-lg px-4 py-2 text-left flex items-center justify-between shadow-sm hover:bg-theme-secondary transition-colors duration-200"
        >
          <span className="block truncate text-theme-textPrimary">
            Select Resorts ({selectedResorts.length})
          </span>
          <svg className="h-5 w-5 text-theme-textSecondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Elevation Selection - Inline buttons */}
        <div className="inline-flex items-center gap-1 bg-theme-background border border-theme-border rounded-lg px-3 py-2 shadow-sm">
          {(['bot', 'mid', 'top'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setSelectedElevation(level)}
              className={`px-2 py-0.5 text-sm rounded transition-colors duration-200 ${
                selectedElevation === level
                  ? 'text-theme-accent font-medium'
                  : 'text-theme-textSecondary hover:text-theme-textPrimary'
              }`}
            >
              {level === 'bot' ? 'Base' : level === 'mid' ? 'Mid' : 'Peak'}
            </button>
          ))}
        </div>

        {/* View Mode Dropdown */}
        <div className="relative" data-dropdown>
          <button
            onClick={() => {
              setShowViewModeMenu(!showViewModeMenu);
              setShowElevationMenu(false);
              setShowSortMenu(false);
              setShowSortDayMenu(false);
            }}
            className="w-full md:w-36 bg-theme-background border border-theme-border rounded-lg px-3 py-2 text-left flex items-center justify-between shadow-sm hover:bg-theme-secondary transition-colors duration-200"
          >
            <span className="block truncate text-sm font-medium text-theme-accent">
              {viewMode === 'default' ? 'Default View' : viewMode === 'full' ? 'Full View' : 'Compact'}
            </span>
            <svg className="h-4 w-4 text-theme-textSecondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {showViewModeMenu && (
            <div className="absolute right-0 z-10 mt-1 w-36 bg-theme-background rounded-lg shadow-lg border border-theme-border">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setViewMode('default');
                    setShowViewModeMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${viewMode === 'default' ? 'bg-theme-secondary text-theme-accent font-medium' : 'hover:bg-theme-secondary text-theme-textPrimary'}`}
                >
                  Default View
                </button>
                <button
                  onClick={() => {
                    setViewMode('full');
                    setShowViewModeMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${viewMode === 'full' ? 'bg-theme-secondary text-theme-accent font-medium' : 'hover:bg-theme-secondary text-theme-textPrimary'}`}
                >
                  Full View
                </button>
                <button
                  onClick={() => {
                    setViewMode('compact');
                    setShowViewModeMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${viewMode === 'compact' ? 'bg-theme-secondary text-theme-accent font-medium' : 'hover:bg-theme-secondary text-theme-textPrimary'}`}
                >
                  Compact
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compact Filter Group */}
      <div className="inline-flex items-center gap-3 bg-theme-background border border-theme-border rounded-lg px-4 py-2 shadow-sm">
        {/* Sort Dropdown */}
        <div className="relative inline-flex items-center" data-dropdown>
          <span className="text-sm text-theme-textSecondary mr-1.5">Sort:</span>
          <button
            onClick={() => {
              setShowSortMenu(!showSortMenu);
              setShowElevationMenu(false);
              setShowSortDayMenu(false);
              setShowViewModeMenu(false);
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-theme-textPrimary hover:text-theme-accent transition-colors duration-200"
          >
            <span className="capitalize">
              {selectedSort === 'temperature' ? 'Temperature' :
               selectedSort === 'snowfall' ? 'Snowfall' : 'Wind'}
            </span>
            <svg className="h-3.5 w-3.5 text-theme-textSecondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {showSortMenu && (
            <div className="absolute top-full left-0 z-10 mt-2 w-36 bg-theme-background rounded-lg shadow-lg border border-theme-border">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setSelectedSort('temperature');
                    setShowSortMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${selectedSort === 'temperature' ? 'text-theme-accent font-medium' : 'hover:bg-theme-secondary text-theme-textPrimary'}`}
                >
                  Temperature
                </button>
                <button
                  onClick={() => {
                    setSelectedSort('snowfall');
                    setShowSortMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${selectedSort === 'snowfall' ? 'text-theme-accent font-medium' : 'hover:bg-theme-secondary text-theme-textPrimary'}`}
                >
                  Snowfall
                </button>
                <button
                  onClick={() => {
                    setSelectedSort('wind');
                    setShowSortMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${selectedSort === 'wind' ? 'text-theme-accent font-medium' : 'hover:bg-theme-secondary text-theme-textPrimary'}`}
                >
                  Wind
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="text-theme-textSecondary opacity-50">|</span>

        {/* Sort Day Dropdown */}
        <div className="relative inline-flex items-center" data-dropdown>
          <span className="text-sm text-theme-textSecondary mr-1.5">Within:</span>
          <button
            onClick={() => {
              setShowSortDayMenu(!showSortDayMenu);
              setShowElevationMenu(false);
              setShowSortMenu(false);
              setShowViewModeMenu(false);
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-theme-textPrimary hover:text-theme-accent transition-colors duration-200"
          >
            <span>{sortDayText}</span>
            <svg className="h-3.5 w-3.5 text-theme-textSecondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {showSortDayMenu && (
            <div className="absolute top-full left-0 z-10 mt-2 w-36 bg-theme-background rounded-lg shadow-lg border border-theme-border">
              <div className="p-2 space-y-1">
                {/* Special aggregate options */}
                {sortDayData.specialOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedSortDay(option.value as SortDay);
                      setShowSortDayMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${selectedSortDay === option.value ? 'text-theme-accent font-medium' : 'hover:bg-theme-secondary text-theme-textPrimary'}`}
                  >
                    {option.name}
                  </button>
                ))}

                {/* Separator */}
                {sortDayData.regularDays.length > 0 && (
                  <div className="border-t border-theme-border my-1"></div>
                )}

                {/* Regular day options */}
                {sortDayData.regularDays.length > 0 ?
                  sortDayData.regularDays.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedSortDay(index);
                        setShowSortDayMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${selectedSortDay === index ? 'text-theme-accent font-medium' : 'hover:bg-theme-secondary text-theme-textPrimary'}`}
                    >
                      {day.name}
                    </button>
                  )) :
                  !sortDayData.specialOptions.length && (
                    <div className="text-sm text-theme-textSecondary px-3 py-1.5">Loading...</div>
                  )
                }
              </div>
            </div>
          )}
        </div>

        <span className="text-theme-textSecondary opacity-50">|</span>

        {/* Order Toggle */}
        <button
          onClick={() => setIsReversed(!isReversed)}
          className="text-sm font-medium text-theme-textPrimary hover:text-theme-accent transition-colors duration-200"
        >
          {isReversed ? '↑ Reverse' : '↓ Normal'}
        </button>
      </div>
    </div>
  );
}

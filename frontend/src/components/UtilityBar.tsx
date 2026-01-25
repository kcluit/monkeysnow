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
  const [showElevationMenu, setShowElevationMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showSortDayMenu, setShowSortDayMenu] = useState(false);
  const [showViewModeMenu, setShowViewModeMenu] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (!(e.target as HTMLElement).closest('[data-dropdown]')) {
        setShowElevationMenu(false);
        setShowSortMenu(false);
        setShowSortDayMenu(false);
        setShowViewModeMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getSortDayOptions = (): SortDayData => {
    const specialOptions = [
      { name: "Next 3 Days", value: "next3days" },
      { name: "Next 7 Days", value: "next7days" }
    ];

    if (selectedResorts.length === 0 || !allWeatherData) {
      return { specialOptions, regularDays: [] };
    }

    const firstResort = selectedResorts[0];
    const resortData = processResortData(allWeatherData, firstResort, selectedElevation);

    return {
      specialOptions,
      regularDays: resortData?.days || []
    };
  };

  const elevationText = selectedElevation === 'bot' ? 'Base Forecast' :
                       selectedElevation === 'mid' ? 'Mid Forecast' : 'Peak Forecast';

  const sortText = selectedSort === 'temperature' ? 'Sort by Temperature' :
                   selectedSort === 'snowfall' ? 'Sort by Snowfall' : 'Sort by Wind';

  const sortDayData = getSortDayOptions();
  const getSortDayText = (): string => {
    if (typeof selectedSortDay === 'string') {
      const specialOption = sortDayData.specialOptions.find(opt => opt.value === selectedSortDay);
      return specialOption?.name || 'Today';
    } else {
      return sortDayData.regularDays[selectedSortDay]?.name || 'Today';
    }
  };
  const sortDayText = getSortDayText();

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

        {/* Elevation Dropdown */}
        <div className="relative" data-dropdown>
          <button
            onClick={() => {
              setShowElevationMenu(!showElevationMenu);
              setShowSortMenu(false);
              setShowSortDayMenu(false);
              setShowViewModeMenu(false);
            }}
            className="w-full md:w-48 bg-theme-background border border-theme-border rounded-lg px-4 py-2 text-left flex items-center justify-between shadow-sm hover:bg-theme-secondary transition-colors duration-200"
          >
            <span className="block truncate capitalize text-theme-textPrimary">{elevationText}</span>
            <svg className="h-5 w-5 text-theme-textSecondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {showElevationMenu && (
            <div className="absolute right-0 z-10 mt-1 w-48 bg-theme-background rounded-lg shadow-lg border border-theme-border">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setSelectedElevation('bot');
                    setShowElevationMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-theme-secondary rounded-lg text-theme-textPrimary transition-colors duration-200"
                >
                  Base Forecast
                </button>
                <button
                  onClick={() => {
                    setSelectedElevation('mid');
                    setShowElevationMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-theme-secondary rounded-lg text-theme-textPrimary transition-colors duration-200"
                >
                  Mid Forecast
                </button>
                <button
                  onClick={() => {
                    setSelectedElevation('top');
                    setShowElevationMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-theme-secondary rounded-lg text-theme-textPrimary transition-colors duration-200"
                >
                  Peak Forecast
                </button>
              </div>
            </div>
          )}
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
              {viewMode === 'default' ? 'Default' : viewMode === 'full' ? 'Full View' : 'Compact'}
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
                  Default
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

      <div className="flex items-center gap-4">
        {/* Reverse Order Button */}
        <button
          onClick={() => setIsReversed(!isReversed)}
          className="px-4 py-2 bg-theme-background border border-theme-border rounded-lg shadow-sm hover:bg-theme-secondary text-sm font-medium text-theme-textPrimary transition-colors duration-200"
        >
          {isReversed ? '↑ Reverse Order' : '↓ Normal Order'}
        </button>

        {/* Sort Dropdown */}
        <div className="relative" data-dropdown>
          <button
            onClick={() => {
              setShowSortMenu(!showSortMenu);
              setShowElevationMenu(false);
              setShowSortDayMenu(false);
              setShowViewModeMenu(false);
            }}
            className="w-full md:w-48 bg-theme-background border border-theme-border rounded-lg px-4 py-2 text-left flex items-center justify-between shadow-sm hover:bg-theme-secondary transition-colors duration-200"
          >
            <span className="block truncate capitalize text-theme-textPrimary">{sortText}</span>
            <svg className="h-5 w-5 text-theme-textSecondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {showSortMenu && (
            <div className="absolute right-0 z-10 mt-1 w-48 bg-theme-background rounded-lg shadow-lg border border-theme-border">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setSelectedSort('temperature');
                    setShowSortMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-theme-secondary rounded-lg text-theme-textPrimary transition-colors duration-200"
                >
                  Sort by Temperature
                </button>
                <button
                  onClick={() => {
                    setSelectedSort('snowfall');
                    setShowSortMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-theme-secondary rounded-lg text-theme-textPrimary transition-colors duration-200"
                >
                  Sort by Snowfall
                </button>
                <button
                  onClick={() => {
                    setSelectedSort('wind');
                    setShowSortMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-theme-secondary rounded-lg text-theme-textPrimary transition-colors duration-200"
                >
                  Sort by Wind
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sort Day Dropdown */}
        <div className="relative" data-dropdown>
          <button
            onClick={() => {
              setShowSortDayMenu(!showSortDayMenu);
              setShowElevationMenu(false);
              setShowSortMenu(false);
              setShowViewModeMenu(false);
            }}
            className="w-full md:w-40 bg-theme-background border border-theme-border rounded-lg px-4 py-2 text-left flex items-center justify-between shadow-sm hover:bg-theme-secondary transition-colors duration-200"
          >
            <span className="block truncate capitalize text-theme-textPrimary">{sortDayText}</span>
            <svg className="h-5 w-5 text-theme-textSecondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {showSortDayMenu && (
            <div className="absolute right-0 z-10 mt-1 w-40 bg-theme-background rounded-lg shadow-lg border border-theme-border">
              <div className="p-2 space-y-1">
                {/* Special aggregate options */}
                {sortDayData.specialOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedSortDay(option.value as SortDay);
                      setShowSortDayMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-theme-secondary rounded-lg font-medium text-theme-accent transition-colors duration-200"
                  >
                    {option.name}
                  </button>
                ))}

                {/* Separator */}
                {sortDayData.regularDays.length > 0 && (
                  <div className="border-t border-theme-border my-2"></div>
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
                      className="w-full text-left px-4 py-2 text-sm hover:bg-theme-secondary rounded-lg text-theme-textPrimary transition-colors duration-200"
                    >
                      {day.name}
                    </button>
                  )) :
                  !sortDayData.specialOptions.length && (
                    <div className="text-sm text-theme-textSecondary px-4 py-2">Loading...</div>
                  )
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

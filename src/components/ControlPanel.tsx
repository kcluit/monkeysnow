import { useState, useEffect, ChangeEvent } from 'react';
import type { ControlPanelProps, SortDay, SortDayData } from '../types';

interface ExtendedControlPanelProps extends ControlPanelProps {
  openResortModal: () => void;
}

export function ControlPanel({
  selectedResorts,
  setSelectedResorts,
  selectedElevation,
  setSelectedElevation,
  selectedSort,
  setSelectedSort,
  selectedSortDay,
  setSelectedSortDay,
  moreInfo,
  setMoreInfo,
  isReversed,
  setIsReversed,
  filteredResorts,
  allWeatherData,
  processResortData,
  cancelLoading,
  openResortModal
}: ExtendedControlPanelProps): JSX.Element {
  const [showElevationMenu, setShowElevationMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showSortDayMenu, setShowSortDayMenu] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (!(e.target as HTMLElement).closest('[data-dropdown]')) {
        setShowElevationMenu(false);
        setShowSortMenu(false);
        setShowSortDayMenu(false);
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
    const elevation = selectedElevation === 'bot' ? 'botData' : selectedElevation === 'mid' ? 'midData' : 'topData';
    const resortData = processResortData(allWeatherData, firstResort, elevation);

    return {
      specialOptions,
      regularDays: resortData?.days || []
    };
  };

  const isAllSelected = filteredResorts.length > 0 && filteredResorts.every(resort => selectedResorts.includes(resort));

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
        {/* Resort Selection Dropdown */}
        <div className="relative" data-dropdown>
          <button
            onClick={() => {
              setShowDropdown(!showDropdown);
              setShowElevationMenu(false);
              setShowSortMenu(false);
              setShowSortDayMenu(false);
              if (!showDropdown && searchInputRef.current) {
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }
            }}
            className="w-full md:w-64 bg-theme-background border border-theme-border rounded-lg px-4 py-2 text-left flex items-center justify-between shadow-sm hover:bg-theme-secondary transition-colors duration-200"
          >
            <span className="block truncate text-theme-textPrimary">Select Resorts</span>
            <svg className="h-5 w-5 text-theme-textSecondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {showDropdown && (
            <div className="absolute z-10 mt-1 w-full md:w-64 bg-theme-background rounded-lg shadow-lg max-h-96 overflow-y-auto border border-theme-border">
              <div className="sticky top-0 bg-theme-background p-2 border-b border-theme-border">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-theme-border rounded-md pl-9 focus:outline-none focus:ring-2 focus:ring-theme-accent focus:border-transparent bg-theme-background text-theme-textPrimary placeholder-theme-textSecondary"
                    placeholder="Search resorts..."
                    onClick={(e) => e.stopPropagation()}
                  />
                  <svg className="absolute left-3 top-2.5 h-5 w-5 text-theme-textSecondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="p-2 space-y-1">
                <label className="flex items-center p-2 hover:bg-theme-secondary rounded cursor-pointer transition-colors duration-200">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-theme-border"
                  />
                  <span className="ml-2 text-sm font-medium text-theme-textPrimary">
                    {isAllSelected ? 'Deselect All' : 'Select All'}
                  </span>
                </label>
                <div className="border-t border-theme-border my-2"></div>
                {filteredResorts.map(resort => (
                  <label key={resort} className="flex items-center p-2 hover:bg-theme-secondary rounded cursor-pointer transition-colors duration-200">
                    <input
                      type="checkbox"
                      checked={selectedResorts.includes(resort)}
                      onChange={() => handleResortToggle(resort)}
                      className="h-4 w-4 rounded border-theme-border"
                    />
                    <span className="ml-2 text-sm text-theme-textPrimary">{getDisplayName(resort)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Elevation Dropdown */}
        <div className="relative" data-dropdown>
          <button
            onClick={() => {
              setShowElevationMenu(!showElevationMenu);
              setShowDropdown(false);
              setShowSortMenu(false);
              setShowSortDayMenu(false);
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

        {/* Full View Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={moreInfo}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMoreInfo(e.target.checked)}
            className="h-4 w-4 rounded border-theme-border"
          />
          <span className="text-sm font-bold text-theme-accent">Full View</span>
        </label>
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
              setShowDropdown(false);
              setShowElevationMenu(false);
              setShowSortDayMenu(false);
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
              setShowDropdown(false);
              setShowElevationMenu(false);
              setShowSortMenu(false);
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

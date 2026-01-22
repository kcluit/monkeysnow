import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { ResortCard } from './components/ResortCard';
import { DefaultCard } from './components/DefaultCard';
import { ThemeToggle } from './components/ThemeToggle';
import { useWeatherData } from './hooks/useWeatherData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useResortFiltering } from './hooks/useResortFiltering';
import { processResortData } from './utils/weather';
import {
  skiResorts,
  defaultSelectedResorts,
  defaultElevation,
  defaultSort,
  defaultSortDay,
  getDisplayName
} from './utils/constants';
import type {
  ElevationLevel,
  ElevationDataKey,
  SortOption,
  SortDay,
  ProcessedResortData
} from './types';

function App(): JSX.Element {
  // Weather data hook
  const { allWeatherData, loading, error, createLoadingController, cancelLoading } = useWeatherData();

  // Local storage state
  const [selectedResorts, setSelectedResorts] = useLocalStorage<string[]>('selectedResorts', defaultSelectedResorts);
  const [selectedElevation, setSelectedElevation] = useLocalStorage<ElevationLevel>('selectedElevation', defaultElevation);
  const [selectedSort, setSelectedSort] = useLocalStorage<SortOption>('selectedSort', defaultSort);
  const [selectedSortDay, setSelectedSortDay] = useLocalStorage<SortDay>('selectedSortDay', defaultSortDay);
  const [isReversed, setIsReversed] = useLocalStorage<boolean>('reverseOrder', false);

  // Local component state
  const [moreInfo, setMoreInfo] = useState(false);
  const [resortData, setResortData] = useState<Map<string, ProcessedResortData>>(new Map());

  // Resort filtering hook
  const { searchTerm, setSearchTerm, filteredResorts, sortResorts } = useResortFiltering(skiResorts, allWeatherData);

  // Load resort data
  const loadResort = useCallback(async (resortName: string): Promise<boolean> => {
    if (!allWeatherData) return false;

    try {
      const elevation: ElevationDataKey = selectedElevation === 'bot' ? 'botData' : selectedElevation === 'mid' ? 'midData' : 'topData';
      const data = processResortData(allWeatherData, resortName, elevation);

      if (data) {
        data.name = getDisplayName(resortName);
        setResortData(prev => new Map(prev.set(resortName, data)));
      }
      return true;
    } catch (err) {
      console.warn(`Failed to load ${resortName}:`, err);
      return false;
    }
  }, [allWeatherData, selectedElevation]);

  // Load all selected resorts
  const loadSelectedResorts = useCallback(async (): Promise<void> => {
    if (!allWeatherData || selectedResorts.length === 0) {
      setResortData(new Map());
      return;
    }

    // Create new loading controller
    const controller = createLoadingController();

    try {
      // Sort resorts
      const sortedResorts = sortResorts(
        selectedResorts,
        selectedSort,
        selectedElevation,
        selectedSortDay,
        isReversed
      );

      // Clear existing data
      setResortData(new Map());

      // Load resorts in parallel
      await Promise.all(
        sortedResorts.map(resort => {
          if (controller.signal.aborted) return Promise.resolve(false);
          return loadResort(resort);
        })
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error('Error loading resorts:', err);
      }
    }
  }, [
    allWeatherData,
    selectedResorts,
    selectedSort,
    selectedElevation,
    selectedSortDay,
    isReversed,
    sortResorts,
    loadResort,
    createLoadingController
  ]);

  // Load resorts when dependencies change
  useEffect(() => {
    loadSelectedResorts();
  }, [loadSelectedResorts]);

  // Handle resort selection changes
  const handleResortsChange = useCallback((newResorts: string[] | ((prev: string[]) => string[])): void => {
    setSelectedResorts(newResorts);
  }, [setSelectedResorts]);

  // Handle elevation changes
  const handleElevationChange = useCallback((newElevation: ElevationLevel): void => {
    setSelectedElevation(newElevation);
  }, [setSelectedElevation]);

  // Handle sort changes
  const handleSortChange = useCallback((newSort: SortOption): void => {
    setSelectedSort(newSort);
  }, [setSelectedSort]);

  // Handle sort day changes
  const handleSortDayChange = useCallback((newSortDay: SortDay): void => {
    setSelectedSortDay(newSortDay);
  }, [setSelectedSortDay]);

  // Handle reverse order changes
  const handleReverseChange = useCallback((newReversed: boolean): void => {
    setIsReversed(newReversed);
  }, [setIsReversed]);

  // Get sorted resort data for display
  const displayResorts = useMemo((): ProcessedResortData[] => {
    if (!allWeatherData || selectedResorts.length === 0) return [];

    const sortedResorts = sortResorts(
      selectedResorts,
      selectedSort,
      selectedElevation,
      selectedSortDay,
      isReversed
    );

    return sortedResorts
      .map(resortId => resortData.get(resortId))
      .filter((resort): resort is ProcessedResortData => Boolean(resort));
  }, [
    allWeatherData,
    selectedResorts,
    selectedSort,
    selectedElevation,
    selectedSortDay,
    isReversed,
    resortData,
    sortResorts
  ]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-white dark:bg-dark-bg transition-colors duration-300">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-600 dark:text-dark-text-secondary">Loading weather data...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-white dark:bg-dark-bg transition-colors duration-300">
        <div className="text-center">
          <div className="text-xl font-semibold text-red-600">Error loading weather data</div>
          <div className="text-sm text-gray-600 dark:text-dark-text-secondary mt-2">Please try refreshing the page</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-white dark:bg-dark-bg transition-colors duration-300">
      {/* Floating Action Button - Theme Toggle */}
      <div className="fixed bottom-6 right-6 z-50 md:bottom-8 md:right-8">
        <ThemeToggle />
      </div>

      <div className="max-w-7xl mx-auto">
        <Header />
        <ControlPanel
          selectedResorts={selectedResorts}
          setSelectedResorts={handleResortsChange}
          selectedElevation={selectedElevation}
          setSelectedElevation={handleElevationChange}
          selectedSort={selectedSort}
          setSelectedSort={handleSortChange}
          selectedSortDay={selectedSortDay}
          setSelectedSortDay={handleSortDayChange}
          moreInfo={moreInfo}
          setMoreInfo={setMoreInfo}
          isReversed={isReversed}
          setIsReversed={handleReverseChange}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filteredResorts={filteredResorts}
          allWeatherData={allWeatherData}
          processResortData={processResortData}
          cancelLoading={cancelLoading}
        />

        <div className="space-y-8">
          {displayResorts.map((resort, index) => (
            <div key={`${resort.name}-${index}`}>
              {moreInfo ? (
                <ResortCard resort={resort} />
              ) : (
                <DefaultCard resort={resort} />
              )}
            </div>
          ))}

          {selectedResorts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-dark-text-secondary text-lg">Select resorts to view forecasts</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

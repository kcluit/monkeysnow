import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { FullView } from './components/FullView';
import { DefaultCard } from './components/DefaultCard';
import { CommandPalette } from './components/CommandPalette';
import { FPSCounter } from './components/FPSCounter';
import { ResortSelectionModal } from './components/ResortSelectionModal';
import { useWeatherData } from './hooks/useWeatherData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useResortFiltering } from './hooks/useResortFiltering';
import { useTheme } from './hooks/useTheme';
import { useFont } from './hooks/useFont';
import { useFullscreen } from './hooks/useFullscreen';
import { useFPSCounter } from './hooks/useFPSCounter';
import { useCommandPalette } from './hooks/useCommandPalette';
import { useRainbowText } from './hooks/useRainbowText';
import { useHideEmoji } from './hooks/useHideEmoji';
import { useResortHierarchy } from './hooks/useResortHierarchy';
import { processResortData } from './utils/weather';
import { generateControlCommands } from './utils/commandGenerators';
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
  ProcessedResortData,
  Command,
  SortDayData
} from './types';

function App(): JSX.Element {
  // Theme, font, fullscreen, FPS, rainbow, and hide emoji hooks
  const { setTheme, availableThemes } = useTheme();
  const { font, setFont, availableFonts } = useFont();
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen();
  const { fps, isEnabled: isFPSEnabled, setEnabled: setFPSEnabled } = useFPSCounter();
  const { isRainbowEnabled, setRainbowEnabled } = useRainbowText();
  const { isHideEmojiEnabled, setHideEmojiEnabled } = useHideEmoji();

  // Weather data hook
  const { allWeatherData, loading, error, createLoadingController, cancelLoading } = useWeatherData();

  // Local storage state
  const [selectedResorts, setSelectedResorts] = useLocalStorage<string[]>('selectedResorts', defaultSelectedResorts);
  const [selectedElevation, setSelectedElevation] = useLocalStorage<ElevationLevel>('selectedElevation', defaultElevation);
  const [selectedSort, setSelectedSort] = useLocalStorage<SortOption>('selectedSort', defaultSort);
  const [selectedSortDay, setSelectedSortDay] = useLocalStorage<SortDay>('selectedSortDay', defaultSortDay);
  const [isReversed, setIsReversed] = useLocalStorage<boolean>('reverseOrder', false);
  const [showControlPanel, setShowControlPanel] = useLocalStorage<boolean>('showControlPanel', true);

  // Local component state
  const [moreInfo, setMoreInfo] = useState(false);
  const [resortData, setResortData] = useState<Map<string, ProcessedResortData>>(new Map());

  // Resort hierarchy hook for modal
  const resortHierarchy = useResortHierarchy({
    selectedResorts,
    onResortsChange: setSelectedResorts,
  });

  // Resort filtering hook
  const { searchTerm, setSearchTerm, filteredResorts, sortResorts } = useResortFiltering(skiResorts, allWeatherData);

  // Get sort day options for command palette
  const getSortDayData = useCallback((): SortDayData => {
    const specialOptions = [
      { name: "Next 3 Days", value: "next3days" },
      { name: "Next 7 Days", value: "next7days" }
    ];

    if (selectedResorts.length === 0 || !allWeatherData) {
      return { specialOptions, regularDays: [] };
    }

    const firstResort = selectedResorts[0];
    const elevation: ElevationDataKey = selectedElevation === 'bot' ? 'botData' : selectedElevation === 'mid' ? 'midData' : 'topData';
    const resortDataResult = processResortData(allWeatherData, firstResort, elevation);

    return {
      specialOptions,
      regularDays: resortDataResult?.days || []
    };
  }, [selectedResorts, allWeatherData, selectedElevation]);

  const sortDayData = useMemo(() => getSortDayData(), [getSortDayData]);

  // Build commands for command palette
  const commands: Command[] = useMemo(() => {
    // Base commands (Theme, Font, etc.)
    const baseCommands: Command[] = [
      {
        id: 'theme',
        name: 'Theme',
        icon: '🎨',
        subCommands: availableThemes.map((t) => ({
          id: `theme-${t.id}`,
          name: t.name,
          icon: t.isDark ? '🌙' : '☀️',
          action: () => setTheme(t.id),
        })),
      },
      {
        id: 'font',
        name: 'Font',
        icon: '🔤',
        subCommands: availableFonts.map((f) => ({
          id: `font-${f.id}`,
          name: f.name,
          icon: f.isMonospace ? '💻' : '📝',
          action: () => setFont(f.id),
        })),
      },
      {
        id: 'rainbow',
        name: 'Rainbow Text',
        icon: '🌈',
        subCommands: [
          {
            id: 'rainbow-on',
            name: 'On',
            icon: isRainbowEnabled ? '✓' : '',
            action: () => setRainbowEnabled(true),
          },
          {
            id: 'rainbow-off',
            name: 'Off',
            icon: !isRainbowEnabled ? '✓' : '',
            action: () => setRainbowEnabled(false),
          },
        ],
      },
      {
        id: 'fullscreen',
        name: 'Fullscreen',
        icon: '⬛',
        shortcut: 'F11',
        subCommands: [
          {
            id: 'fullscreen-on',
            name: 'On',
            icon: isFullscreen ? '✓' : '',
            action: enterFullscreen,
          },
          {
            id: 'fullscreen-off',
            name: 'Off',
            icon: !isFullscreen ? '✓' : '',
            action: exitFullscreen,
          },
        ],
      },
      {
        id: 'fps',
        name: 'FPS Counter',
        icon: '📊',
        subCommands: [
          {
            id: 'fps-on',
            name: 'On',
            icon: isFPSEnabled ? '✓' : '',
            action: () => setFPSEnabled(true),
          },
          {
            id: 'fps-off',
            name: 'Off',
            icon: !isFPSEnabled ? '✓' : '',
            action: () => setFPSEnabled(false),
          },
        ],
      },
      {
        id: 'hide-emoji',
        name: 'Hide Emoji',
        icon: '🙈',
        subCommands: [
          {
            id: 'hide-emoji-on',
            name: 'On',
            icon: isHideEmojiEnabled ? '✓' : '',
            action: () => setHideEmojiEnabled(true),
          },
          {
            id: 'hide-emoji-off',
            name: 'Off',
            icon: !isHideEmojiEnabled ? '✓' : '',
            action: () => setHideEmojiEnabled(false),
          },
        ],
      },
    ];

    // Control panel commands
    const controlCommands = generateControlCommands({
      selectedElevation,
      setSelectedElevation,
      selectedSort,
      setSelectedSort,
      selectedSortDay,
      setSelectedSortDay,
      sortDayData,
      isReversed,
      setIsReversed,
      moreInfo,
      setMoreInfo,
      showControlPanel,
      setShowControlPanel,
      openResortSelector: resortHierarchy.openModal,
    });

    return [...baseCommands, ...controlCommands];
  }, [
    availableThemes, setTheme,
    availableFonts, setFont,
    isRainbowEnabled, setRainbowEnabled,
    isFullscreen, enterFullscreen, exitFullscreen,
    isFPSEnabled, setFPSEnabled,
    isHideEmojiEnabled, setHideEmojiEnabled,
    selectedElevation, setSelectedElevation,
    selectedSort, setSelectedSort,
    selectedSortDay, setSelectedSortDay,
    sortDayData,
    isReversed, setIsReversed,
    moreInfo, setMoreInfo,
    showControlPanel, setShowControlPanel,
    resortHierarchy.openModal,
  ]);

  // Command palette hook
  const commandPalette = useCommandPalette(commands);

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
      <div className="min-h-screen p-8 flex items-center justify-center bg-theme-background transition-colors duration-300">
        <div className="text-center">
          <div className="text-xl font-semibold text-theme-textSecondary">Loading weather data...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-theme-background transition-colors duration-300">
        <div className="text-center">
          <div className="text-xl font-semibold text-red-600">Error loading weather data</div>
          <div className="text-sm text-theme-textSecondary mt-2">Please try refreshing the page</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-theme-background transition-colors duration-300">
      {/* Command Palette */}
      <CommandPalette palette={commandPalette} hideEmoji={isHideEmojiEnabled} />

      {/* Resort Selection Modal */}
      <ResortSelectionModal hierarchy={resortHierarchy} hideEmoji={isHideEmojiEnabled} />

      {/* FPS Counter */}
      <FPSCounter fps={fps} isVisible={isFPSEnabled} />

      <div className="max-w-7xl mx-auto">
        <Header font={font} />

        {/* Conditionally render Control Panel */}
        {showControlPanel && (
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
        )}

        <div className="space-y-8">
          {displayResorts.map((resort, index) => (
            <div key={`${resort.name}-${index}`}>
              {moreInfo ? (
                <FullView resort={resort} />
              ) : (
                <DefaultCard resort={resort} />
              )}
            </div>
          ))}

          {selectedResorts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-theme-textSecondary text-lg">Select resorts to view forecasts</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

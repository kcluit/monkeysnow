import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { UtilityBar } from './components/UtilityBar';
import { CompactUtilityBar } from './components/CompactUtilityBar';
import { FullView, DefaultCard, CompactCard } from './components/cards';
import { DetailedResortView } from './components/detail';
import { CommandPalette } from './components/CommandPalette';
import { FPSCounter } from './components/FPSCounter';
import { ResortSelectionGridModal } from './components/ResortSelectionModal';
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
import { useHideBorders } from './hooks/useHideBorders';
import { useShowDate } from './hooks/useShowDate';
import { useResortHierarchy } from './hooks/useResortHierarchy';
import { useUnitSystem } from './hooks/useUnitSystem';
import { useDetailViewState } from './hooks/useDetailViewState';
import { useLanguage } from './hooks/useLanguage';
import { useHierarchy } from './contexts/HierarchyContext';
import { processResortData } from './utils/weather';
import { generateControlCommands } from './utils/commandGenerators';
import { getSortDayData } from './utils/sortDayHelpers';
import { getResortLocation } from './utils/openMeteoClient';
import {
    defaultSelectedResorts,
    defaultElevation,
    defaultSort,
    defaultSortDay,
    defaultTemperatureMetric,
} from './utils/constants';
import type {
    ElevationLevel,
    SortOption,
    SortDay,
    ProcessedResortData,
    Command,
    ViewMode,
    TemperatureMetric,
    SnowfallEstimateMode,
    UtilityBarStyle
} from './types';

function App(): JSX.Element {
    // Theme, font, fullscreen, FPS, rainbow, hide emoji, and language hooks
    const { setTheme, availableThemes } = useTheme();
    const { font, setFont, availableFonts } = useFont();
    const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen();
    const { fps, isEnabled: isFPSEnabled, setEnabled: setFPSEnabled } = useFPSCounter();
    const { isRainbowEnabled, setRainbowEnabled } = useRainbowText();
    const { isHideEmojiEnabled, setHideEmojiEnabled } = useHideEmoji();
    const { isHideBordersEnabled, setHideBordersEnabled } = useHideBorders();
    const { isShowDateEnabled, setShowDateEnabled } = useShowDate();
    const { t, language, setLanguage, availableLanguages } = useLanguage();

    // Hierarchy data from backend (resort list, display names)
    const { skiResorts, getDisplayName, loading: hierarchyLoading } = useHierarchy();

    // Detail view state hook
    const { isDetailView, selectedResortId, enterDetailView, exitDetailView } = useDetailViewState();

    // Weather data hook
    const { allWeatherData, loading: weatherLoading, error, createLoadingController, cancelLoading } = useWeatherData();

    // Combined loading state
    const loading = weatherLoading || hierarchyLoading;

    // Local storage state
    const [selectedResorts, setSelectedResorts] = useLocalStorage<string[]>('selectedResorts', defaultSelectedResorts);
    const [selectedElevation, setSelectedElevation] = useLocalStorage<ElevationLevel>('selectedElevation', defaultElevation);
    const [selectedSort, setSelectedSort] = useLocalStorage<SortOption>('selectedSort', defaultSort);
    const [selectedSortDay, setSelectedSortDay] = useLocalStorage<SortDay>('selectedSortDay', defaultSortDay);
    const [isReversed, setIsReversed] = useLocalStorage<boolean>('reverseOrder', false);
    const [showUtilityBar, setShowUtilityBar] = useLocalStorage<boolean>('showUtilityBar', true);
    const [utilityBarStyle, setUtilityBarStyle] = useLocalStorage<UtilityBarStyle>('utilityBarStyle', 'large');

    // Local component state
    const [viewMode, setViewMode] = useLocalStorage<ViewMode>('viewMode', 'default');
    const [selectedTemperatureMetric, setSelectedTemperatureMetric] = useLocalStorage<TemperatureMetric>('temperatureMetric', defaultTemperatureMetric);
    const [snowfallEstimateMode, setSnowfallEstimateMode] = useLocalStorage<SnowfallEstimateMode>('snowfallEstimateMode', 'model');
    const [unitSystem, setUnitSystem] = useUnitSystem();
    const [resortData, setResortData] = useState<Map<string, ProcessedResortData>>(new Map());

    // Resort hierarchy hook for modal
    const resortHierarchy = useResortHierarchy({
        selectedResorts,
        onResortsChange: setSelectedResorts,
    });

    // Resort filtering hook
    const { searchTerm, setSearchTerm, filteredResorts, sortResorts } = useResortFiltering(skiResorts, allWeatherData);

    // Get sort day options for command palette
    const sortDayData = useMemo(
        () => getSortDayData(selectedResorts, allWeatherData, processResortData, selectedElevation),
        [selectedResorts, allWeatherData, selectedElevation]
    );

    // Build commands for command palette
    const commands: Command[] = useMemo(() => {
        // Base commands (Theme, Font, etc.)
        const baseCommands: Command[] = [
            {
                id: 'theme',
                name: 'Theme',
                icon: '🌗',
                subCommands: availableThemes.map((t) => ({
                    id: `theme-${t.id}`,
                    name: t.name,
                    icon: t.isDark ? '🌑' : '🌕',
                    action: () => setTheme(t.id),
                })),
            },
            {
                id: 'font',
                name: 'Font',
                icon: '📄',
                subCommands: availableFonts.map((f) => ({
                    id: `font-${f.id}`,
                    name: f.name,
                    icon: f.isMonospace ? '💾' : '📝',
                    action: () => setFont(f.id),
                })),
            },
            {
                id: 'rainbow',
                name: 'Rainbow text',
                icon: '💎',
                subCommands: [
                    {
                        id: 'rainbow-on',
                        name: 'On',
                        icon: isRainbowEnabled ? '✔️' : '',
                        action: () => setRainbowEnabled(true),
                    },
                    {
                        id: 'rainbow-off',
                        name: 'Off',
                        icon: !isRainbowEnabled ? '✔️' : '',
                        action: () => setRainbowEnabled(false),
                    },
                ],
            },
            {
                id: 'fullscreen',
                name: 'Fullscreen',
                icon: '📺',
                shortcut: 'F11',
                subCommands: [
                    {
                        id: 'fullscreen-on',
                        name: 'On',
                        icon: isFullscreen ? '✔️' : '',
                        action: enterFullscreen,
                    },
                    {
                        id: 'fullscreen-off',
                        name: 'Off',
                        icon: !isFullscreen ? '✔️' : '',
                        action: exitFullscreen,
                    },
                ],
            },
            {
                id: 'fps',
                name: 'FPS counter',
                icon: '⚡',
                subCommands: [
                    {
                        id: 'fps-on',
                        name: 'On',
                        icon: isFPSEnabled ? '✔️' : '',
                        action: () => setFPSEnabled(true),
                    },
                    {
                        id: 'fps-off',
                        name: 'Off',
                        icon: !isFPSEnabled ? '✔️' : '',
                        action: () => setFPSEnabled(false),
                    },
                ],
            },
            {
                id: 'hide-emoji',
                name: 'Hide emoji',
                icon: '👻',
                subCommands: [
                    {
                        id: 'hide-emoji-on',
                        name: 'On',
                        icon: isHideEmojiEnabled ? '✔️' : '',
                        action: () => setHideEmojiEnabled(true),
                    },
                    {
                        id: 'hide-emoji-off',
                        name: 'Off',
                        icon: !isHideEmojiEnabled ? '✔️' : '',
                        action: () => setHideEmojiEnabled(false),
                    },
                ],
            },
            {
                id: 'show-borders',
                name: 'Show borders',
                icon: '🔲',
                subCommands: [
                    {
                        id: 'show-borders-on',
                        name: 'On',
                        icon: !isHideBordersEnabled ? '✔️' : '',
                        action: () => setHideBordersEnabled(false),
                    },
                    {
                        id: 'show-borders-off',
                        name: 'Off',
                        icon: isHideBordersEnabled ? '✔️' : '',
                        action: () => setHideBordersEnabled(true),
                    },
                ],
            },
            {
                id: 'show-date',
                name: 'Show date',
                icon: '📅',
                subCommands: [
                    {
                        id: 'show-date-on',
                        name: 'On',
                        icon: isShowDateEnabled ? '✔️' : '',
                        action: () => setShowDateEnabled(true),
                    },
                    {
                        id: 'show-date-off',
                        name: 'Off',
                        icon: !isShowDateEnabled ? '✔️' : '',
                        action: () => setShowDateEnabled(false),
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
            viewMode,
            setViewMode,
            selectedTemperatureMetric,
            setSelectedTemperatureMetric,
            snowfallEstimateMode,
            setSnowfallEstimateMode,
            showUtilityBar,
            setShowUtilityBar,
            utilityBarStyle,
            setUtilityBarStyle,
            unitSystem,
            setUnitSystem,
            openResortSelector: resortHierarchy.openModal,
            languageId: language.id,
            setLanguage,
            availableLanguages,
        });

        return [...baseCommands, ...controlCommands];
    }, [
        availableThemes, setTheme,
        availableFonts, setFont,
        isRainbowEnabled, setRainbowEnabled,
        isFullscreen, enterFullscreen, exitFullscreen,
        isFPSEnabled, setFPSEnabled,
        isHideEmojiEnabled, setHideEmojiEnabled,
        isHideBordersEnabled, setHideBordersEnabled,
        isShowDateEnabled, setShowDateEnabled,
        selectedElevation, setSelectedElevation,
        selectedSort, setSelectedSort,
        selectedSortDay, setSelectedSortDay,
        sortDayData,
        isReversed, setIsReversed,
        viewMode, setViewMode,
        selectedTemperatureMetric, setSelectedTemperatureMetric,
        snowfallEstimateMode, setSnowfallEstimateMode,
        showUtilityBar, setShowUtilityBar,
        utilityBarStyle, setUtilityBarStyle,
        unitSystem, setUnitSystem,
        resortHierarchy.openModal,
        language.id, setLanguage, availableLanguages, t,
    ]);

    // Command palette hook
    const commandPalette = useCommandPalette(commands);

    // Load resort data
    const loadResort = useCallback(async (resortName: string): Promise<boolean> => {
        if (!allWeatherData) return false;

        try {
            const data = processResortData(allWeatherData, resortName, selectedElevation, selectedTemperatureMetric, snowfallEstimateMode, unitSystem);

            if (data) {
                data.name = getDisplayName(resortName);
                setResortData(prev => new Map(prev.set(resortName, data)));
            }
            return true;
        } catch (err) {
            console.warn(`Failed to load ${resortName}:`, err);
            return false;
        }
    }, [allWeatherData, selectedElevation, selectedTemperatureMetric, snowfallEstimateMode, unitSystem]);

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
                isReversed,
                selectedTemperatureMetric,
                snowfallEstimateMode,
                unitSystem
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
        selectedTemperatureMetric,
        snowfallEstimateMode,
        unitSystem,
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

    // Handle resort card click to enter detail view
    const handleResortClick = useCallback((resortId: string): void => {
        enterDetailView(resortId);
    }, [enterDetailView]);

    // Get resort location for detail view
    const selectedResortLocation = useMemo(() => {
        if (!selectedResortId) return null;
        const location = getResortLocation(selectedResortId);
        if (!location) return null;
        return {
            lat: location.loc[0],
            lon: location.loc[1],
            baseElevation: location.bot,
            midElevation: location.mid,
            topElevation: location.top,
        };
    }, [selectedResortId]);

    // Get sorted resort data for display
    const displayResorts = useMemo((): ProcessedResortData[] => {
        if (!allWeatherData || selectedResorts.length === 0) return [];

        const sortedResorts = sortResorts(
            selectedResorts,
            selectedSort,
            selectedElevation,
            selectedSortDay,
            isReversed,
            selectedTemperatureMetric,
            snowfallEstimateMode,
            unitSystem
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
        selectedTemperatureMetric,
        snowfallEstimateMode,
        unitSystem,
        resortData,
        sortResorts
    ]);

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-6 md:p-8 flex items-center justify-center bg-theme-background transition-colors duration-300 overflow-x-hidden">
                <div className="text-center">
                    <div className="text-xl font-semibold text-theme-textSecondary">{t('loading.weatherData')}</div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="min-h-screen p-4 sm:p-6 md:p-8 flex items-center justify-center bg-theme-background transition-colors duration-300 overflow-x-hidden">
                <div className="text-center">
                    <div className="text-xl font-semibold text-red-600">{t('error.loadingWeatherData')}</div>
                    <div className="text-sm text-theme-textSecondary mt-2">{t('error.tryRefreshing')}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-theme-background transition-colors duration-300 overflow-x-hidden">
            {/* Command Palette */}
            <CommandPalette palette={commandPalette} hideEmoji={isHideEmojiEnabled} />

            {/* Resort Selection Grid Modal */}
            <ResortSelectionGridModal hierarchy={resortHierarchy} hideEmoji={isHideEmojiEnabled} />

            {/* FPS Counter */}
            <FPSCounter fps={fps} isVisible={isFPSEnabled} />

            <div className="max-w-7xl mx-auto">
                <Header font={font} />

                {/* Detail View Mode */}
                {isDetailView && selectedResortId && selectedResortLocation ? (
                    <DetailedResortView
                        resortId={selectedResortId}
                        resortName={getDisplayName(selectedResortId)}
                        location={selectedResortLocation}
                        onBack={exitDetailView}
                        unitSystem={unitSystem}
                    />
                ) : (
                    <>
                        {/* Conditionally render Utility Bar */}
                        {showUtilityBar && (
                            utilityBarStyle === 'compact' ? (
                                <CompactUtilityBar
                                    selectedResorts={selectedResorts}
                                    setSelectedResorts={handleResortsChange}
                                    selectedElevation={selectedElevation}
                                    setSelectedElevation={handleElevationChange}
                                    selectedSort={selectedSort}
                                    setSelectedSort={handleSortChange}
                                    selectedSortDay={selectedSortDay}
                                    setSelectedSortDay={handleSortDayChange}
                                    viewMode={viewMode}
                                    setViewMode={setViewMode}
                                    isReversed={isReversed}
                                    setIsReversed={handleReverseChange}
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    filteredResorts={filteredResorts}
                                    allWeatherData={allWeatherData}
                                    processResortData={processResortData}
                                    cancelLoading={cancelLoading}
                                    openResortModal={resortHierarchy.openModal}
                                />
                            ) : (
                                <UtilityBar
                                    selectedResorts={selectedResorts}
                                    setSelectedResorts={handleResortsChange}
                                    selectedElevation={selectedElevation}
                                    setSelectedElevation={handleElevationChange}
                                    selectedSort={selectedSort}
                                    setSelectedSort={handleSortChange}
                                    selectedSortDay={selectedSortDay}
                                    setSelectedSortDay={handleSortDayChange}
                                    viewMode={viewMode}
                                    setViewMode={setViewMode}
                                    isReversed={isReversed}
                                    setIsReversed={handleReverseChange}
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    filteredResorts={filteredResorts}
                                    allWeatherData={allWeatherData}
                                    processResortData={processResortData}
                                    cancelLoading={cancelLoading}
                                    openResortModal={resortHierarchy.openModal}
                                />
                            )
                        )}

                        <div className={viewMode === 'compact' ? "compact-grid" : "space-y-8"}>
                            {displayResorts.map((resort, index) => (
                                <div key={`${resort.name}-${index}`}>
                                    {viewMode === 'full' ? (
                                        <FullView resort={resort} temperatureMetric={selectedTemperatureMetric} showDate={isShowDateEnabled} unitSystem={unitSystem} onResortClick={handleResortClick} />
                                    ) : viewMode === 'compact' ? (
                                        <CompactCard resort={resort} temperatureMetric={selectedTemperatureMetric} showDate={isShowDateEnabled} unitSystem={unitSystem} onResortClick={handleResortClick} />
                                    ) : (
                                        <DefaultCard resort={resort} temperatureMetric={selectedTemperatureMetric} showDate={isShowDateEnabled} unitSystem={unitSystem} onResortClick={handleResortClick} />
                                    )}
                                </div>
                            ))}

                            {selectedResorts.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-theme-textSecondary text-lg">{t('empty.selectResorts')}</div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default App;

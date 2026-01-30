import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Header } from './components/Header';
import { UtilityBar } from './components/UtilityBar';
import { CompactUtilityBar } from './components/CompactUtilityBar';
import { CommandPalette } from './components/CommandPalette';
import { AboutPage, SettingsPage } from './pages';

// Lazy load card components - only one is rendered based on viewMode
const FullView = lazy(() => import('./components/cards/FullView').then(m => ({ default: m.FullView })));
const DefaultCard = lazy(() => import('./components/cards/DefaultCard').then(m => ({ default: m.DefaultCard })));
const CompactCard = lazy(() => import('./components/cards/CompactCard').then(m => ({ default: m.CompactCard })));

// Lazy load DetailedResortView - imports uplot (~80KB) and chart configs
const DetailedResortView = lazy(() => import('./components/detail/DetailedResortView').then(m => ({ default: m.DetailedResortView })));
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
import { useHideIcons } from './hooks/useHideIcons';
import { useHideBorders } from './hooks/useHideBorders';
import { useShowDate } from './hooks/useShowDate';
import { useResortHierarchy } from './hooks/useResortHierarchy';
import { useUnitSystem } from './hooks/useUnitSystem';
import { useLanguage } from './hooks/useLanguage';
import { useHierarchy } from './contexts/HierarchyContext';
import { processResortData } from './utils/weather';
import { generateControlCommands } from './utils/commandGenerators';
import { icons } from './constants/icons';
import { setGlobalZoomSync } from './lib/charts/chartRegistry';
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

// Resort Detail Page wrapper component
function ResortDetailRoute({
    unitSystem,
    showUtilityBar,
    getDisplayName,
}: {
    unitSystem: 'metric' | 'imperial';
    showUtilityBar: boolean;
    getDisplayName: (id: string) => string;
}): JSX.Element | null {
    const { resortId } = useParams<{ resortId: string }>();

    if (!resortId) {
        return <Navigate to="/" replace />;
    }

    const location = getResortLocation(resortId);
    if (!location) {
        return <Navigate to="/" replace />;
    }

    const resortLocation = {
        lat: location.loc[0],
        lon: location.loc[1],
        baseElevation: location.bot,
        midElevation: location.mid,
        topElevation: location.top,
    };

    return (
        <Suspense fallback={<div className="text-center py-12 text-theme-textSecondary">Loading charts...</div>}>
            <DetailedResortView
                resortId={resortId}
                resortName={getDisplayName(resortId)}
                location={resortLocation}
                onBack={onBack}
                unitSystem={unitSystem}
                showUtilityBar={showUtilityBar}
            />
        </Suspense>
    );
}

function App(): JSX.Element {
    const navigate = useNavigate();

    // Theme, font, fullscreen, FPS, rainbow, hide emoji, and language hooks
    const { theme, setTheme, availableThemes } = useTheme();
    const { font, setFont, availableFonts } = useFont();
    const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen();
    const { fps, isEnabled: isFPSEnabled, setEnabled: setFPSEnabled } = useFPSCounter();
    const { isRainbowEnabled, setRainbowEnabled } = useRainbowText();
    const { isHideIconsEnabled, setHideIconsEnabled } = useHideIcons();
    const { isHideBordersEnabled, setHideBordersEnabled } = useHideBorders();
    const { isShowDateEnabled, setShowDateEnabled } = useShowDate();
    const { t, language, setLanguage, availableLanguages } = useLanguage();

    // Hierarchy data from backend (resort list, display names)
    const { skiResorts, getDisplayName, loading: hierarchyLoading } = useHierarchy();

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
    const [chartZoomSyncEnabled, setChartZoomSyncEnabled] = useLocalStorage<boolean>('chartZoomSync', true);
    const [unitSystem, setUnitSystem] = useUnitSystem();

    // Sync chart zoom sync setting to registry
    useEffect(() => {
        setGlobalZoomSync(chartZoomSyncEnabled);
    }, [chartZoomSyncEnabled]);
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

    // Dependencies for command palette lazy generation
    const commandDeps = [
        availableThemes, setTheme,
        availableFonts, setFont,
        isRainbowEnabled, setRainbowEnabled,
        isFullscreen, enterFullscreen, exitFullscreen,
        isFPSEnabled, setFPSEnabled,
        isHideIconsEnabled, setHideIconsEnabled,
        isHideBordersEnabled, setHideBordersEnabled,
        isShowDateEnabled, setShowDateEnabled,
        chartZoomSyncEnabled, setChartZoomSyncEnabled,
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
        language.id, setLanguage, availableLanguages,
    ];

    // Command factory for lazy generation - commands only built when palette opens
    const commandFactory = useCallback(() => {
        // Base commands (Theme, Font, etc.)
        const baseCommands: Command[] = [
            {
                id: 'theme',
                name: 'Theme',
                icon: icons.theme,
                subCommands: availableThemes.map((t) => ({
                    id: `theme-${t.id}`,
                    name: t.name,
                    icon: t.isDark ? icons.dark : icons.light,
                    action: () => setTheme(t.id),
                })),
            },
            {
                id: 'font',
                name: 'Font',
                icon: icons.font,
                subCommands: availableFonts.map((f) => ({
                    id: `font-${f.id}`,
                    name: f.name,
                    icon: f.isMonospace ? icons.monospace : icons.regular,
                    action: () => setFont(f.id),
                })),
            },
            {
                id: 'rainbow',
                name: 'Rainbow text',
                icon: icons.rainbow,
                subCommands: [
                    {
                        id: 'rainbow-on',
                        name: 'On',
                        icon: isRainbowEnabled ? icons.check : undefined,
                        action: () => setRainbowEnabled(true),
                    },
                    {
                        id: 'rainbow-off',
                        name: 'Off',
                        icon: !isRainbowEnabled ? icons.check : undefined,
                        action: () => setRainbowEnabled(false),
                    },
                ],
            },
            {
                id: 'fullscreen',
                name: 'Fullscreen',
                icon: icons.fullscreen,
                shortcut: 'F11',
                subCommands: [
                    {
                        id: 'fullscreen-on',
                        name: 'On',
                        icon: isFullscreen ? icons.check : undefined,
                        action: enterFullscreen,
                    },
                    {
                        id: 'fullscreen-off',
                        name: 'Off',
                        icon: !isFullscreen ? icons.check : undefined,
                        action: exitFullscreen,
                    },
                ],
            },
            {
                id: 'fps',
                name: 'FPS counter',
                icon: icons.fps,
                subCommands: [
                    {
                        id: 'fps-on',
                        name: 'On',
                        icon: isFPSEnabled ? icons.check : undefined,
                        action: () => setFPSEnabled(true),
                    },
                    {
                        id: 'fps-off',
                        name: 'Off',
                        icon: !isFPSEnabled ? icons.check : undefined,
                        action: () => setFPSEnabled(false),
                    },
                ],
            },
            {
                id: 'hide-icons',
                name: 'Hide icons',
                icon: icons.hideIcons,
                subCommands: [
                    {
                        id: 'hide-icons-on',
                        name: 'On',
                        icon: isHideIconsEnabled ? icons.check : undefined,
                        action: () => setHideIconsEnabled(true),
                    },
                    {
                        id: 'hide-icons-off',
                        name: 'Off',
                        icon: !isHideIconsEnabled ? icons.check : undefined,
                        action: () => setHideIconsEnabled(false),
                    },
                ],
            },
            {
                id: 'show-borders',
                name: 'Show borders',
                icon: icons.borders,
                subCommands: [
                    {
                        id: 'show-borders-on',
                        name: 'On',
                        icon: !isHideBordersEnabled ? icons.check : undefined,
                        action: () => setHideBordersEnabled(false),
                    },
                    {
                        id: 'show-borders-off',
                        name: 'Off',
                        icon: isHideBordersEnabled ? icons.check : undefined,
                        action: () => setHideBordersEnabled(true),
                    },
                ],
            },
            {
                id: 'show-date',
                name: 'Show date',
                icon: icons.date,
                subCommands: [
                    {
                        id: 'show-date-on',
                        name: 'On',
                        icon: isShowDateEnabled ? icons.check : undefined,
                        action: () => setShowDateEnabled(true),
                    },
                    {
                        id: 'show-date-off',
                        name: 'Off',
                        icon: !isShowDateEnabled ? icons.check : undefined,
                        action: () => setShowDateEnabled(false),
                    },
                ],
            },
            {
                id: 'chart-zoom-sync',
                name: 'Sync chart zoom',
                icon: icons.link,
                subCommands: [
                    {
                        id: 'chart-zoom-sync-on',
                        name: 'On',
                        icon: chartZoomSyncEnabled ? icons.check : undefined,
                        action: () => setChartZoomSyncEnabled(true),
                    },
                    {
                        id: 'chart-zoom-sync-off',
                        name: 'Off',
                        icon: !chartZoomSyncEnabled ? icons.check : undefined,
                        action: () => setChartZoomSyncEnabled(false),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, commandDeps);

    // Command palette hook with lazy generation
    const commandPalette = useCommandPalette(commandFactory, commandDeps);

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

    // Handle resort card click to navigate to detail view
    const handleResortClick = useCallback((resortId: string): void => {
        navigate(`/resort/${resortId}`);
    }, [navigate]);

    // Handle back from detail view
    const handleBackFromDetail = useCallback((): void => {
        navigate('/');
    }, [navigate]);

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

    // Home page content (resort list)
    const homeContent = (
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
                <Suspense fallback={<div className="text-center py-4 text-theme-textSecondary">Loading...</div>}>
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
                </Suspense>

                {selectedResorts.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-theme-textSecondary text-lg">{t('empty.selectResorts')}</div>
                    </div>
                )}
            </div>
        </>
    );

    // Settings page props
    const settingsProps = {
        availableThemes,
        setTheme,
        currentThemeId: theme?.id || 'dark',
        availableFonts,
        setFont,
        currentFontId: font?.id || 'system',
        isRainbowEnabled,
        setRainbowEnabled,
        isHideIconsEnabled,
        setHideIconsEnabled,
        isHideBordersEnabled,
        setHideBordersEnabled,
        isShowDateEnabled,
        setShowDateEnabled,
        isFullscreen,
        enterFullscreen,
        exitFullscreen,
        isFPSEnabled,
        setFPSEnabled,
        chartZoomSyncEnabled,
        setChartZoomSyncEnabled,
        selectedElevation,
        setSelectedElevation,
        selectedSort,
        setSelectedSort,
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
        language,
        setLanguage,
        availableLanguages,
        openResortSelector: resortHierarchy.openModal,
    };

    return (
        <div className="min-h-screen bg-theme-background transition-colors duration-300 overflow-x-hidden">
            {/* Command Palette */}
            <CommandPalette palette={commandPalette} hideIcons={isHideIconsEnabled} />

            {/* Resort Selection Grid Modal */}
            <ResortSelectionGridModal hierarchy={resortHierarchy} hideIcons={isHideIconsEnabled} />

            {/* FPS Counter */}
            <FPSCounter fps={fps} isVisible={isFPSEnabled} />

            <Routes>
                {/* Home route - resort list */}
                <Route path="/" element={
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                        <Header font={font} hideIcons={isHideIconsEnabled} />
                        {homeContent}
                    </div>
                } />

                {/* Resort detail route */}
                <Route path="/resort/:resortId" element={
                    <>
                        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                            <Header font={font} hideIcons={isHideIconsEnabled} />
                        </div>
                        <ResortDetailRoute
                            unitSystem={unitSystem}
                            showUtilityBar={showUtilityBar}
                            getDisplayName={getDisplayName}
                            onBack={handleBackFromDetail}
                        />
                    </>
                } />

                {/* About route */}
                <Route path="/about" element={
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                        <Header font={font} hideIcons={isHideIconsEnabled} />
                        <AboutPage />
                    </div>
                } />

                {/* Settings route */}
                <Route path="/settings" element={
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                        <Header font={font} hideIcons={isHideIconsEnabled} />
                        <SettingsPage {...settingsProps} />
                    </div>
                } />

                {/* Catch-all redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Header } from './components/Header';
import { UtilityBar } from './components/UtilityBar';
import { CompactUtilityBar } from './components/CompactUtilityBar';
import { CommandPalette } from './components/CommandPalette';
import { AboutPage, SettingsPage } from './pages';
import Konami from 'konami';

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
    WeatherModelSetting,
    UtilityBarStyle
} from './types';

// Resort Detail Page wrapper component
function ResortDetailRoute({
    unitSystem,
    showUtilityBar,
    utilityBarStyle,
    getDisplayName,
}: {
    unitSystem: 'metric' | 'imperial';
    showUtilityBar: boolean;
    utilityBarStyle: UtilityBarStyle;
    getDisplayName: (id: string) => string;
}): JSX.Element | null {
    const { resortId } = useParams<{ resortId: string }>();
    const navigate = useNavigate();

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

    const handleBack = () => navigate('/');

    return (
        <Suspense fallback={<div className="text-center py-12 text-theme-textSecondary">Loading charts...</div>}>
            <DetailedResortView
                resortId={resortId}
                resortName={getDisplayName(resortId)}
                location={resortLocation}
                unitSystem={unitSystem}
                showUtilityBar={showUtilityBar}
                utilityBarStyle={utilityBarStyle}
                onBack={handleBack}
            />
        </Suspense>
    );
}

function App(): JSX.Element {
    const navigate = useNavigate();

    // Theme, font, fullscreen, FPS, rainbow, hide emoji, and language hooks
    const { theme, setTheme, availableThemes, applyTheme, resetPreview } = useTheme();
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
    const [weatherModel, setWeatherModel] = useLocalStorage<WeatherModelSetting>('weatherModel', 'auto');
    const [chartZoomSyncEnabled, setChartZoomSyncEnabled] = useLocalStorage<boolean>('chartZoomSync', true);
    const [unitSystem, setUnitSystem] = useUnitSystem();

    // Sync chart zoom sync setting to registry
    useEffect(() => {
        setGlobalZoomSync(chartZoomSyncEnabled);
    }, [chartZoomSyncEnabled]);
    const [resortData, setResortData] = useState<Map<string, ProcessedResortData>>(new Map());

    // First-visit initialization: pick a random resort when hierarchy loads
    const [hasInitialized, setHasInitialized] = useLocalStorage<boolean>('hasInitializedResorts', false);

    useEffect(() => {
        if (!hierarchyLoading && skiResorts.length > 0 && !hasInitialized) {
            const randomIndex = Math.floor(Math.random() * skiResorts.length);
            setSelectedResorts([skiResorts[randomIndex]]);
            setHasInitialized(true);
        }
    }, [hierarchyLoading, skiResorts, hasInitialized, setSelectedResorts, setHasInitialized]);


    // Banner dismissal state
    const [bannerDismissed, setBannerDismissed] = useLocalStorage<boolean>('bannerDismissed', false);

    // Resort hierarchy hook for modal
    const resortHierarchy = useResortHierarchy({
        selectedResorts,
        onResortsChange: setSelectedResorts,
    });


    // Open resort modal and auto-dismiss the banner
    const openResortModalAndDismissBanner = useCallback(() => {
        resortHierarchy.openModal();
        setBannerDismissed(true);
    }, [resortHierarchy.openModal, setBannerDismissed]);

    useEffect(() => {
        new Konami("https://monkeytype.com/");
    }, [])

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
        weatherModel, setWeatherModel,
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
            weatherModel,
            setWeatherModel,
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

    // Preview theme when selecting in command palette
    useEffect(() => {
        if (!commandPalette.isOpen) {
            resetPreview();
            return;
        }

        const selectedCommand = commandPalette.filteredCommands[commandPalette.selectedIndex];
        if (selectedCommand && selectedCommand.id.startsWith('theme-')) {
            const themeId = selectedCommand.id.replace('theme-', '');
            const themeToPreview = availableThemes.find(t => t.id === themeId);
            if (themeToPreview) {
                applyTheme(themeToPreview);
            }
        } else {
            resetPreview();
        }
    }, [
        commandPalette.isOpen,
        commandPalette.selectedIndex,
        commandPalette.filteredCommands,
        availableThemes,
        applyTheme,
        resetPreview
    ]);

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

            {/* First-visit discovery banner */}
            {!bannerDismissed && skiResorts.length > 0 && selectedResorts.length > 0 && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 mb-6 rounded-xl bg-theme-secondary border border-theme-border text-sm text-theme-textSecondary">
                    <span>
                        Showing {selectedResorts.length} of {skiResorts.length} resorts — click <button onClick={openResortModalAndDismissBanner} className="underline text-theme-textPrimary hover:text-theme-accent transition-colors">Select Resorts</button> to add more
                    </span>
                    <button
                        onClick={() => setBannerDismissed(true)}
                        className="shrink-0 p-1 rounded-md hover:bg-theme-border transition-colors text-theme-textSecondary hover:text-theme-textPrimary"
                        aria-label="Dismiss banner"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            )}

            {error && (
                <div className="text-center py-12">
                    <div className="text-xl font-semibold text-red-600">{t('error.loadingWeatherData')}</div>
                    <div className="text-sm text-theme-textSecondary mt-2">{t('error.tryRefreshing')}</div>
                </div>
            )}

            <div className={viewMode === 'compact' ? "compact-grid" : "space-y-8"}>
                <Suspense fallback={<div className="text-center py-4 text-theme-textSecondary">Loading...</div>}>
                    {displayResorts.map((resort, index) => (
                        <div key={`${resort.name}-${index}`}>
                            {viewMode === 'full' ? (
                                <FullView resort={resort} temperatureMetric={selectedTemperatureMetric} showDate={isShowDateEnabled} unitSystem={unitSystem} onResortClick={handleResortClick} selectedElevation={selectedElevation} />
                            ) : viewMode === 'compact' ? (
                                <CompactCard resort={resort} temperatureMetric={selectedTemperatureMetric} showDate={isShowDateEnabled} unitSystem={unitSystem} onResortClick={handleResortClick} />
                            ) : (
                                <DefaultCard resort={resort} temperatureMetric={selectedTemperatureMetric} showDate={isShowDateEnabled} unitSystem={unitSystem} onResortClick={handleResortClick} />
                            )}
                        </div>
                    ))}
                </Suspense>

                {/* Ghost "Add more resorts" card */}
                {selectedResorts.length > 0 && (
                    <button
                        onClick={openResortModalAndDismissBanner}
                        className={`w-full border-2 border-dashed border-theme-border rounded-${viewMode === 'compact' ? 'xl' : '2xl'} ${viewMode === 'compact' ? 'p-6' : 'p-8'} flex flex-col items-center justify-center gap-2 text-theme-textSecondary hover:text-theme-textPrimary hover:border-theme-textSecondary hover:bg-theme-secondary transition-all duration-200 cursor-pointer group`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width={viewMode === 'compact' ? 24 : 32} height={viewMode === 'compact' ? 24 : 32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:opacity-100 transition-opacity"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <span className={`${viewMode === 'compact' ? 'text-sm' : 'text-base'} font-medium`}>Add more resorts</span>
                    </button>
                )}

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
        selectedSortDay,
        setSelectedSortDay: handleSortDayChange,
        sortDayData,
        isReversed,
        setIsReversed: handleReverseChange,
        viewMode,
        setViewMode,
        selectedTemperatureMetric,
        setSelectedTemperatureMetric,
        snowfallEstimateMode,
        setSnowfallEstimateMode,
        weatherModel,
        setWeatherModel,
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
            {/* Open-Meteo Attribution */}
            <a
                href="https://github.com/open-meteo/open-meteo"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed top-2 right-2 text-xs text-theme-textSecondary hover:text-theme-textPrimary underline transition-colors z-10"
            >
                Weather data by Open-Meteo.com
            </a>

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
                            utilityBarStyle={utilityBarStyle}
                            getDisplayName={getDisplayName}
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

            {/* Footer */}
            <footer className="fixed bottom-2 left-4 text-xs text-theme-textSecondary opacity-40 hover:opacity-100 transition-opacity z-10">
                <a
                    href="https://github.com/kcluit/monkeysnow"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-theme-textPrimary transition-colors"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    github
                </a>
            </footer>
        </div>
    );
}

export default App;

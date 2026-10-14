import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { Header } from './components/Header';
import { PageMeta } from './components/PageMeta';
import { usePageMeta } from './hooks/usePageMeta';
import { UtilityBar } from './components/UtilityBar';
import { CompactUtilityBar } from './components/CompactUtilityBar';
import { CommandPalette } from './components/CommandPalette';
import { AboutPage, SettingsPage, TermsPage, PrivacyPage } from './pages';
import Konami from 'konami';

// Lazy load card components - only one is rendered based on viewMode
const FullView = lazy(() => import('./components/cards/FullView').then(m => ({ default: m.FullView })));
const DefaultCard = lazy(() => import('./components/cards/DefaultCard').then(m => ({ default: m.DefaultCard })));
const CompactCard = lazy(() => import('./components/cards/CompactCard').then(m => ({ default: m.CompactCard })));
const GraphView = lazy(() => import('./components/graph/GraphView').then(m => ({ default: m.GraphView })));

// Lazy load DetailedResortView - imports uplot (~80KB) and chart configs
const DetailedResortView = lazy(() => import('./components/detail/DetailedResortView').then(m => ({ default: m.DetailedResortView })));
const ModelStylesModal = lazy(() => import('./components/detail/ModelStylesModal').then(m => ({ default: m.ModelStylesModal })));
const DetailedViewModelsPicker = lazy(() => import('./components/detail/DetailedViewPickers').then(m => ({ default: m.DetailedViewModelsPicker })));
const ChartsPicker = lazy(() => import('./components/detail/DetailedViewPickers').then(m => ({ default: m.ChartsPicker })));
import { FPSCounter } from './components/FPSCounter';
import { ResortSelectionGridModal } from './components/ResortSelectionModal';
import { CardModelsModal } from './components/CardModelsModal';
import { useWeatherData, deleteCachedForecast } from './hooks/useWeatherData';
import { useSavedLocations } from './hooks/useSavedLocations';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useResortFiltering } from './hooks/useResortFiltering';
import { useTheme } from './hooks/useTheme';
import { useFont } from './hooks/useFont';
import { useFullscreen, isFullscreenSupported } from './hooks/useFullscreen';
import { useFPSCounter } from './hooks/useFPSCounter';
import { useCommandPalette } from './hooks/useCommandPalette';
import { useRainbowText } from './hooks/useRainbowText';
import { useBoldText } from './hooks/useBoldText';
import { useHideBorders } from './hooks/useHideBorders';
import { useShowDate } from './hooks/useShowDate';
import { useResortHierarchy, MAX_SELECTED_RESORTS } from './hooks/useResortHierarchy';
import { FetchStatus } from './components/FetchStatus';
import { useBudgetPause } from './hooks/useBudgetPause';
import { useUnitSystem } from './hooks/useUnitSystem';
import { useDetailElevation, useForecastHorizon, useLockedCharts } from './hooks/useDetailedViewSettings';
import { useMapLayers } from './hooks/useMapLayers';
import {
    DEFAULT_MAP_ROTATION,
    DEFAULT_MAP_TILT,
    MAP_ROTATION_STORAGE_KEY,
    MAP_TILT_STORAGE_KEY,
    type MapRotation,
    type MapTilt,
} from './utils/mapRotation';
import { useCursorReadout } from './hooks/useCursorReadout';
import { SlopeBandsModal } from './components/map/SlopeBandsModal';
import { useIsMobile } from './hooks/useIsMobile';
import { useLanguage } from './hooks/useLanguage';
import { useHierarchy } from './contexts/HierarchyContext';
import { processResortData } from './utils/weather';
import { generateControlCommands, generateDetailedViewCommands } from './utils/commandGenerators';
import { icons } from './constants/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { setGlobalZoomSync } from './lib/charts/chartRegistry';
import { getSortDayData } from './utils/sortDayHelpers';
import { getResortLocation } from './utils/openMeteoClient';
import { resolveResortId } from './data/resortLocations';
import { pickStarterResort } from './utils/starterResort';
import { openModelStyles, registerModelStylesOpener } from './utils/modelStyles';
import { detailedViewModelsOpener } from './utils/openerRegistry';
import {
    deleteSavedLocation,
    isSavedLocationId,
    saveLocation,
    savedLocationIdFromKey,
    savedLocationPath,
    type SavedLocationInput,
} from './utils/savedLocations';
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
    UtilityBarStyle,
    ResortDisplayLimit,
} from './types';

interface DetailRouteProps {
    unitSystem: 'metric' | 'imperial';
    showUtilityBar: boolean;
    utilityBarStyle: UtilityBarStyle;
    mapRotation: MapRotation;
    mapTilt: MapTilt;
    onSaveLocation: (input: SavedLocationInput) => void;
}

// Resort Detail Page wrapper component
function ResortDetailRoute({
    unitSystem,
    showUtilityBar,
    utilityBarStyle,
    mapRotation,
    mapTilt,
    onSaveLocation,
    getDisplayName,
}: DetailRouteProps & {
    getDisplayName: (id: string) => string;
}): JSX.Element | null {
    const { resortId: requestedId } = useParams<{ resortId: string }>();
    const navigate = useNavigate();

    // Earlier slugs and pre-OpenSkiData IDs (e.g. /resort/Big-White) redirect to the current slug
    const resortId = requestedId ? resolveResortId(requestedId) : null;
    const location = resortId ? getResortLocation(resortId) : null;
    const displayName = resortId ? getDisplayName(resortId) : '';

    // Stable across App re-renders: every chart rebuilds its config when this object changes
    const resortLocation = useMemo(() => location && {
        lat: location.loc[0],
        lon: location.loc[1],
        baseElevation: location.bot,
        midElevation: location.mid,
        topElevation: location.top,
    }, [location]);

    const handleBack = useCallback(() => navigate('/'), [navigate]);

    usePageMeta({
        title: displayName ? `${displayName} Snow Forecast — monkeysnow` : 'monkeysnow — ski resort snow forecasts',
        description: displayName
            ? `Detailed snow forecast for ${displayName}. Multi-model weather charts, hourly snowfall estimates, temperature and wind data.`
            : 'Real-time snow forecasts for ski resorts worldwide.',
        canonical: resortId
            ? `https://monkeysnow.com/resort/${encodeURIComponent(resortId)}`
            : 'https://monkeysnow.com/',
    });

    if (!resortId || !resortLocation) {
        return <Navigate to="/" replace />;
    }
    if (resortId !== requestedId) {
        return <Navigate to={`/resort/${resortId}`} replace />;
    }

    return (
        <Suspense fallback={<div className="text-center py-12 text-theme-textSecondary">Loading charts...</div>}>
            <DetailedResortView
                resortId={resortId}
                resortName={displayName}
                location={resortLocation}
                unitSystem={unitSystem}
                showUtilityBar={showUtilityBar}
                utilityBarStyle={utilityBarStyle}
                mapRotation={mapRotation}
                mapTilt={mapTilt}
                onBack={handleBack}
                onSaveLocation={onSaveLocation}
            />
        </Suspense>
    );
}

// Saved location detail page; only the browser that saved it knows the URL, so it is never indexed
function SavedLocationRoute({
    unitSystem,
    showUtilityBar,
    utilityBarStyle,
    mapRotation,
    mapTilt,
    onSaveLocation,
    onDeleteSavedLocation,
}: DetailRouteProps & {
    onDeleteSavedLocation: (id: string) => void;
}): JSX.Element | null {
    const { locationKey } = useParams<{ locationKey: string }>();
    const navigate = useNavigate();
    const { pathname, state } = useLocation();
    const savedLocations = useSavedLocations();
    const savedLocation = locationKey
        ? savedLocations.find((location) => location.id === savedLocationIdFromKey(locationKey))
        : undefined;

    // Stable across App re-renders: every chart rebuilds its config when this object changes
    const lat = savedLocation?.lat;
    const lon = savedLocation?.lon;
    const elevation = savedLocation?.elevation;
    const viewLocation = useMemo(() => (
        lat === undefined || lon === undefined || elevation === undefined
            ? null
            : { lat, lon, baseElevation: elevation, midElevation: elevation, topElevation: elevation }
    ), [lat, lon, elevation]);

    const handleBack = useCallback(() => navigate('/'), [navigate]);

    usePageMeta({
        title: savedLocation ? `${savedLocation.name} Snow Forecast — monkeysnow` : 'monkeysnow — ski resort snow forecasts',
        description: 'Real-time snow forecasts for ski resorts worldwide.',
        canonical: 'https://monkeysnow.com/',
    });

    // Another browser, or deleted
    if (!savedLocation || !viewLocation) {
        return <Navigate to="/" replace />;
    }

    return (
        <Suspense fallback={<div className="text-center py-12 text-theme-textSecondary">Loading charts...</div>}>
            <DetailedResortView
                key={savedLocation.id}
                resortId={savedLocation.id}
                resortName={savedLocation.name}
                location={viewLocation}
                savedLocation={savedLocation}
                unitSystem={unitSystem}
                showUtilityBar={showUtilityBar}
                utilityBarStyle={utilityBarStyle}
                mapRotation={mapRotation}
                mapTilt={mapTilt}
                onBack={handleBack}
                onSaveLocation={onSaveLocation}
                onDeleteSavedLocation={onDeleteSavedLocation}
                selectionWasFull={Boolean((state as { selectionWasFull?: boolean } | null)?.selectionWasFull)}
                onDismissSelectionWasFull={() => navigate(pathname, { replace: true, state: null })}
            />
        </Suspense>
    );
}

function App(): JSX.Element {
    const navigate = useNavigate();

    // Theme, font, bold text, fullscreen, FPS, rainbow, borders, date, and language hooks
    const { theme, setTheme, availableThemes, applyTheme, resetPreview } = useTheme();
    const { font, setFont, availableFonts, applyFont, resetPreview: resetFontPreview } = useFont();
    const { isBoldTextEnabled, setBoldTextEnabled } = useBoldText();
    const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen();
    const { fps, isEnabled: isFPSEnabled, setEnabled: setFPSEnabled } = useFPSCounter();
    const { isRainbowEnabled, setRainbowEnabled } = useRainbowText();
    const { isHideBordersEnabled, setHideBordersEnabled } = useHideBorders();
    const { isShowDateEnabled, setShowDateEnabled } = useShowDate();
    const { t, language, setLanguage, availableLanguages } = useLanguage();
    const isMobile = useIsMobile();

    // Hierarchy data bundled with the app (resort list, display names)
    const { skiResorts, getDisplayName, loading: hierarchyLoading } = useHierarchy();

    // Local storage state
    const [selectedResorts, setSelectedResorts] = useLocalStorage<string[]>('selectedResorts', defaultSelectedResorts);

    // First visit: start the Selection with the Starter resort
    const [hasInitialized, setHasInitialized] = useLocalStorage<boolean>('hasInitializedResorts', false);
    const { pathname } = useLocation();
    const [landingPath] = useState(pathname);
    // Only the home page shows the Selection, so only it waits for (or fails with) the Selection's forecasts
    const isHomePage = pathname === '/';

    useEffect(() => {
        if (hasInitialized) return;
        const controller = new AbortController();
        pickStarterResort(landingPath, controller.signal).then((resortId) => {
            if (controller.signal.aborted) return;
            setSelectedResorts([resortId]);
            setHasInitialized(true);
        });
        return () => controller.abort();
    }, [hasInitialized, landingPath, setSelectedResorts, setHasInitialized]);

    const [viewMode, setViewMode] = useLocalStorage<ViewMode>('viewMode', 'default');

    // Weather data hook — keeps the selection's forecasts loaded within the Fetch budget,
    // with the hours that Graph view draws
    const { allWeatherData, loading: weatherLoading, error: weatherError, queuedCount, queuedCalls, createLoadingController, cancelLoading } = useWeatherData(selectedResorts, viewMode === 'graph');

    // Block UI while the Starter resort is picked, and if there is NO cached data at all,
    // but not through a rate-limit pause (that can last until tomorrow; the home page
    // explains it in its status row)
    const fetchPause = useBudgetPause();
    const loading = !hasInitialized || (!fetchPause && ((!allWeatherData && weatherLoading) || (!allWeatherData && hierarchyLoading)));
    const [selectedElevation, setSelectedElevation] = useLocalStorage<ElevationLevel>('selectedElevation', defaultElevation);
    const [selectedSort, setSelectedSort] = useLocalStorage<SortOption>('selectedSort', defaultSort);
    const [selectedSortDay, setSelectedSortDay] = useLocalStorage<SortDay>('selectedSortDay', defaultSortDay);
    const [isReversed, setIsReversed] = useLocalStorage<boolean>('reverseOrder', false);
    const [showUtilityBar, setShowUtilityBar] = useLocalStorage<boolean>('showUtilityBar', true);
    const [utilityBarStyle, setUtilityBarStyle] = useLocalStorage<UtilityBarStyle>('utilityBarStyle', 'large');

    // Local component state
    const [selectedTemperatureMetric, setSelectedTemperatureMetric] = useLocalStorage<TemperatureMetric>('temperatureMetric', defaultTemperatureMetric);
    const [snowfallEstimateMode, setSnowfallEstimateMode] = useLocalStorage<SnowfallEstimateMode>('snowfallEstimateMode', 'model');
    const [chartZoomSyncEnabled, setChartZoomSyncEnabled] = useLocalStorage<boolean>('chartZoomSync', true);
    const [mapRotation, setMapRotation] = useLocalStorage<MapRotation>(MAP_ROTATION_STORAGE_KEY, DEFAULT_MAP_ROTATION);
    const [mapTilt, setMapTilt] = useLocalStorage<MapTilt>(MAP_TILT_STORAGE_KEY, DEFAULT_MAP_TILT);
    const [cursorReadoutShown, setCursorReadoutShown] = useCursorReadout();
    // The Detailed view's own choices, also offered on the Settings page and in the command palette
    const [detailElevation, setDetailElevation] = useDetailElevation();
    const [forecastHorizon, setForecastHorizon] = useForecastHorizon();
    const [isChartLocked, setIsChartLocked] = useLockedCharts();
    const [mapLayers, setMapLayers] = useMapLayers();
    const [unitSystem, setUnitSystem] = useUnitSystem();
    const [resortDisplayLimit, setResortDisplayLimit] = useLocalStorage<ResortDisplayLimit>('resortDisplayLimit', 'auto');

    // Sync chart zoom sync setting to registry
    useEffect(() => {
        setGlobalZoomSync(chartZoomSyncEnabled);
    }, [chartZoomSyncEnabled]);
    const [resortData, setResortData] = useState<Map<string, ProcessedResortData>>(new Map());

    // Banner dismissal state
    const [bannerDismissed, setBannerDismissed] = useLocalStorage<boolean>('bannerDismissed', false);

    // Resort hierarchy hook for modal
    const resortHierarchy = useResortHierarchy({
        selectedResorts,
        onResortsChange: setSelectedResorts,
    });

    // Main page models
    const [isCardModelsOpen, setCardModelsOpen] = useState(false);
    const openCardModels = useCallback(() => setCardModelsOpen(true), []);
    const closeCardModels = useCallback(() => setCardModelsOpen(false), []);

    // The Models tab on its own, wherever no chart's gear modal can show it; the detail view, loaded lazily, registers later and wins
    const [isModelStylesOpen, setModelStylesOpen] = useState(false);
    const closeModelStyles = useCallback(() => setModelStylesOpen(false), []);
    useEffect(() => registerModelStylesOpener(() => setModelStylesOpen(true)), []);

    // The Slope bands editor on its own; either map's layers panel has it too
    const [isSlopeBandsOpen, setSlopeBandsOpen] = useState(false);
    const openSlopeBands = useCallback(() => setSlopeBandsOpen(true), []);
    const closeSlopeBands = useCallback(() => setSlopeBandsOpen(false), []);

    // The Detailed view's Models and Charts pickers on their own, for the Settings page and the command palette;
    // on the Detailed view, its own Models picker registers later and wins
    const [detailedViewPicker, setDetailedViewPicker] = useState<'models' | 'charts' | null>(null);
    const closeDetailedViewPicker = useCallback(() => setDetailedViewPicker(null), []);
    const openChartsPicker = useCallback(() => setDetailedViewPicker('charts'), []);
    useEffect(() => detailedViewModelsOpener.register(() => setDetailedViewPicker('models')), []);

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

    // Sort day options for the utility bars, settings and command palette
    const sortDayData = useMemo(
        () => getSortDayData(selectedResorts, allWeatherData, processResortData, selectedElevation, isShowDateEnabled),
        [selectedResorts, allWeatherData, selectedElevation, isShowDateEnabled]
    );

    // Dependencies for command palette lazy generation
    const commandDeps = [
        availableThemes, setTheme,
        availableFonts, setFont,
        isRainbowEnabled, setRainbowEnabled,
        isBoldTextEnabled, setBoldTextEnabled,
        isFullscreen, enterFullscreen, exitFullscreen,
        isFPSEnabled, setFPSEnabled,
        isHideBordersEnabled, setHideBordersEnabled,
        isShowDateEnabled, setShowDateEnabled,
        chartZoomSyncEnabled, setChartZoomSyncEnabled,
        mapRotation, setMapRotation,
        mapTilt, setMapTilt,
        cursorReadoutShown, setCursorReadoutShown,
        openSlopeBands,
        detailElevation, setDetailElevation,
        forecastHorizon, setForecastHorizon,
        isChartLocked, setIsChartLocked,
        mapLayers, setMapLayers,
        openChartsPicker,
        selectedElevation, setSelectedElevation,
        selectedSort, setSelectedSort,
        selectedSortDay, setSelectedSortDay,
        sortDayData,
        isReversed, setIsReversed,
        viewMode, setViewMode,
        selectedTemperatureMetric, setSelectedTemperatureMetric,
        snowfallEstimateMode, setSnowfallEstimateMode,
        openCardModels,
        showUtilityBar, setShowUtilityBar,
        utilityBarStyle, setUtilityBarStyle,
        unitSystem, setUnitSystem,
        resortDisplayLimit, setResortDisplayLimit,
        openResortModalAndDismissBanner,
        language.id, setLanguage, availableLanguages,
    ];

    // Command factory for lazy generation - commands only built when palette opens
    const commandFactory = useCallback(() => {
        // The Detailed view's, after Sync charts and the 3D map commands, with the map's next to Slope bands
        const detailedViewCommands = generateDetailedViewCommands({
            openDetailedViewModels: detailedViewModelsOpener.open,
            openChartsPicker,
            elevationSelection: detailElevation,
            setElevationSelection: setDetailElevation,
            unitSystem,
            forecastHorizon,
            setForecastHorizon,
            isChartLocked,
            setIsChartLocked,
            mapLayers,
            setMapLayers,
        });

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
                id: 'bold-text',
                name: 'Bold text',
                icon: icons.bold,
                subCommands: [
                    {
                        id: 'bold-text-on',
                        name: 'On',
                        icon: isBoldTextEnabled ? icons.check : undefined,
                        action: () => setBoldTextEnabled(true),
                    },
                    {
                        id: 'bold-text-off',
                        name: 'Off',
                        icon: !isBoldTextEnabled ? icons.check : undefined,
                        action: () => setBoldTextEnabled(false),
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
                name: 'Sync charts',
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
            {
                id: 'map-rotation',
                name: '3D map rotation',
                icon: icons.rotate,
                subCommands: [
                    {
                        id: 'map-rotation-linear',
                        name: 'Linear',
                        icon: mapRotation === 'linear' ? icons.check : undefined,
                        action: () => setMapRotation('linear'),
                    },
                    {
                        id: 'map-rotation-linear-reversed',
                        name: 'Linear reversed',
                        icon: mapRotation === 'linearReversed' ? icons.check : undefined,
                        action: () => setMapRotation('linearReversed'),
                    },
                    {
                        id: 'map-rotation-orbital',
                        name: 'Orbital',
                        icon: mapRotation === 'orbital' ? icons.check : undefined,
                        action: () => setMapRotation('orbital'),
                    },
                ],
            },
            {
                id: 'map-tilt',
                name: '3D map tilt',
                icon: icons.tilt,
                subCommands: [
                    {
                        id: 'map-tilt-drag-up',
                        name: 'Drag up',
                        icon: mapTilt === 'dragUp' ? icons.check : undefined,
                        action: () => setMapTilt('dragUp'),
                    },
                    {
                        id: 'map-tilt-drag-down',
                        name: 'Drag down',
                        icon: mapTilt === 'dragDown' ? icons.check : undefined,
                        action: () => setMapTilt('dragDown'),
                    },
                ],
            },
            ...detailedViewCommands,
            {
                id: 'slope-bands',
                name: 'Slope bands',
                icon: icons.slopeBands,
                action: openSlopeBands,
            },
            {
                id: 'cursor-readout',
                name: 'Cursor readout',
                icon: icons.cursor,
                subCommands: [
                    {
                        id: 'cursor-readout-on',
                        name: 'On',
                        icon: cursorReadoutShown ? icons.check : undefined,
                        action: () => setCursorReadoutShown(true),
                    },
                    {
                        id: 'cursor-readout-off',
                        name: 'Off',
                        icon: !cursorReadoutShown ? icons.check : undefined,
                        action: () => setCursorReadoutShown(false),
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
            openCardModels,
            showUtilityBar,
            setShowUtilityBar,
            utilityBarStyle,
            setUtilityBarStyle,
            unitSystem,
            setUnitSystem,
            resortDisplayLimit,
            setResortDisplayLimit,
            openResortSelector: openResortModalAndDismissBanner,
            languageId: language.id,
            setLanguage,
            availableLanguages,
            openModelStyles,
        });

        // No Fullscreen command where the page can't go fullscreen (iPhone)
        return [...baseCommands.filter((command) => command.id !== 'fullscreen' || isFullscreenSupported), ...controlCommands];
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
    }, [allWeatherData, selectedElevation, selectedTemperatureMetric, snowfallEstimateMode, unitSystem, getDisplayName]);

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

    // Preview font when selecting in command palette
    useEffect(() => {
        if (!commandPalette.isOpen) {
            resetFontPreview();
            return;
        }

        const selectedCommand = commandPalette.filteredCommands[commandPalette.selectedIndex];
        if (selectedCommand && selectedCommand.id.startsWith('font-')) {
            const fontId = selectedCommand.id.replace('font-', '');
            const fontToPreview = availableFonts.find(f => f.id === fontId);
            if (fontToPreview) {
                applyFont(fontToPreview);
            }
        } else {
            resetFontPreview();
        }
    }, [
        commandPalette.isOpen,
        commandPalette.selectedIndex,
        commandPalette.filteredCommands,
        availableFonts,
        applyFont,
        resetFontPreview
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
        navigate(isSavedLocationId(resortId) ? savedLocationPath(resortId) : `/resort/${resortId}`);
    }, [navigate]);

    // Saving a Custom location also adds it to the Selection, unless the Selection cap is reached
    const handleSaveLocation = useCallback((input: SavedLocationInput): void => {
        const location = saveLocation(input);
        const selectionWasFull = selectedResorts.length >= MAX_SELECTED_RESORTS;
        if (!selectionWasFull) setSelectedResorts([...selectedResorts, location.id]);
        navigate(savedLocationPath(location.id), { state: { selectionWasFull } });
    }, [selectedResorts, setSelectedResorts, navigate]);

    const handleDeleteSavedLocation = useCallback((id: string): void => {
        navigate('/');
        deleteSavedLocation(id);
        deleteCachedForecast(id);
        setSelectedResorts(prev => prev.filter(resortId => resortId !== id));
    }, [navigate, setSelectedResorts]);

    // Get sorted resort data for display
    const effectiveDisplayLimit = resortDisplayLimit === 'auto'
        ? (isMobile ? 100 : 0)
        : resortDisplayLimit;

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

        const processed = sortedResorts
            .map(resortId => resortData.get(resortId))
            .filter((resort): resort is ProcessedResortData => Boolean(resort));

        if (effectiveDisplayLimit > 0 && processed.length > effectiveDisplayLimit) {
            return processed.slice(0, effectiveDisplayLimit);
        }
        return processed;
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
        sortResorts,
        effectiveDisplayLimit
    ]);

    const isTruncated = effectiveDisplayLimit > 0 && selectedResorts.length > effectiveDisplayLimit;

    // Forecasts failed to load and nothing cached — error state
    if (isHomePage && !allWeatherData && weatherError) {
        return (
            <div className="min-h-screen p-4 sm:p-6 md:p-8 flex items-center justify-center bg-theme-background transition-colors duration-300 overflow-x-hidden">
                <div className="text-center">
                    <div className="text-xl font-semibold text-theme-textSecondary">{t('error.loadingWeatherData')}</div>
                    <div className="mt-2 text-sm text-theme-textSecondary opacity-75">{t('error.tryRefreshing')}</div>
                </div>
            </div>
        );
    }

    // Show loading state
    if (isHomePage && loading) {
        return (
            <div className="min-h-screen p-4 sm:p-6 md:p-8 flex items-center justify-center bg-theme-background transition-colors duration-300 overflow-x-hidden">
                <div className="text-center">
                    <div className="text-xl font-semibold text-theme-textSecondary">{t('loading.weatherData')}</div>
                    <FetchStatus count={queuedCount} calls={queuedCalls} things="resorts" className="mt-2 text-sm text-theme-textSecondary" />
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
                        sortDayData={sortDayData}
                        cancelLoading={cancelLoading}
                        openResortModal={openResortModalAndDismissBanner}
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
                        sortDayData={sortDayData}
                        cancelLoading={cancelLoading}
                        openResortModal={openResortModalAndDismissBanner}
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

            <div className={viewMode === 'compact' ? "compact-grid" : "space-y-8"}>
                <Suspense fallback={<div className="text-center py-4 text-theme-textSecondary">Loading...</div>}>
                    {viewMode === 'graph' && allWeatherData ? (
                        <GraphView
                            resorts={displayResorts}
                            allWeatherData={allWeatherData}
                            elevation={selectedElevation}
                            snowfallMode={snowfallEstimateMode}
                            units={unitSystem}
                            onResortClick={handleResortClick}
                        />
                    ) : displayResorts.map((resort, index) => (
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

                {/* Queued resorts (and rate-limit pauses) */}
                <FetchStatus count={queuedCount} calls={queuedCalls} things="resorts" />

                {isTruncated && (
                    <div className="text-center py-3 text-sm text-theme-textSecondary">
                        Showing {effectiveDisplayLimit} of {selectedResorts.length} selected resorts
                    </div>
                )}

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
        applyTheme,
        resetThemePreview: resetPreview,
        availableFonts,
        setFont,
        currentFontId: font?.id || 'system',
        applyFont,
        resetFontPreview,
        isRainbowEnabled,
        setRainbowEnabled,
        isBoldTextEnabled,
        setBoldTextEnabled,
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
        mapRotation,
        setMapRotation,
        mapTilt,
        setMapTilt,
        cursorReadoutShown,
        setCursorReadoutShown,
        openSlopeBands,
        openDetailedViewModels: detailedViewModelsOpener.open,
        openChartsPicker,
        detailElevation,
        setDetailElevation,
        forecastHorizon,
        setForecastHorizon,
        isChartLocked,
        setIsChartLocked,
        mapLayers,
        setMapLayers,
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
        openCardModels,
        showUtilityBar,
        setShowUtilityBar,
        utilityBarStyle,
        setUtilityBarStyle,
        unitSystem,
        setUnitSystem,
        language,
        setLanguage,
        availableLanguages,
        resortDisplayLimit,
        setResortDisplayLimit,
        openModelStyles,
        openResortSelector: openResortModalAndDismissBanner,
    };

    return (
        <div className="min-h-screen bg-theme-background transition-colors duration-300 overflow-x-hidden">
            {/* Open-Meteo Attribution - pinned on wide screens; on phones it scrolls away instead of covering the cards */}
            <a
                href="https://github.com/open-meteo/open-meteo"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute md:fixed top-2 right-2 text-xs text-theme-textSecondary hover:text-theme-textPrimary underline transition-colors z-10"
            >
                Weather data by Open-Meteo.com
            </a>

            {/* Command Palette */}
            <CommandPalette palette={commandPalette} />

            {/* Resort Selection Grid Modal */}
            <ResortSelectionGridModal hierarchy={resortHierarchy} />

            {/* Main page models */}
            <CardModelsModal isOpen={isCardModelsOpen} onClose={closeCardModels} selectedResorts={selectedResorts} />

            {/* Model styles, opened from the Settings page or the command palette */}
            {isModelStylesOpen && (
                <Suspense fallback={null}>
                    <ModelStylesModal onClose={closeModelStyles} />
                </Suspense>
            )}

            {/* Slope bands, opened from the Settings page or the command palette */}
            {isSlopeBandsOpen && <SlopeBandsModal onClose={closeSlopeBands} />}

            {/* The Detailed view's Models or Charts picker, opened from the Settings page or the command palette */}
            {detailedViewPicker && (
                <Suspense fallback={null}>
                    {detailedViewPicker === 'models'
                        ? <DetailedViewModelsPicker onClose={closeDetailedViewPicker} />
                        : <ChartsPicker onClose={closeDetailedViewPicker} />}
                </Suspense>
            )}

            {/* FPS Counter */}
            <FPSCounter fps={fps} isVisible={isFPSEnabled} />

            <Routes>
                {/* Home route - resort list */}
                <Route path="/" element={
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                        <PageMeta
                            title="monkeysnow — ski resort snow forecasts"
                            description="Real-time snow forecasts for ski resorts worldwide. Compare powder, dry snow, wet snow and rain estimates across multiple weather models."
                            canonical="https://monkeysnow.com/"
                        />
                        <Header font={font} />
                        {homeContent}
                    </div>
                } />

                {/* Resort detail route */}
                <Route path="/resort/:resortId" element={
                    <>
                        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                            <Header font={font} />
                        </div>
                        <ResortDetailRoute
                            unitSystem={unitSystem}
                            showUtilityBar={showUtilityBar}
                            utilityBarStyle={utilityBarStyle}
                            mapRotation={mapRotation}
                            mapTilt={mapTilt}
                            onSaveLocation={handleSaveLocation}
                            getDisplayName={getDisplayName}
                        />
                    </>
                } />

                {/* Saved location detail route */}
                <Route path="/location/:locationKey" element={
                    <>
                        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                            <Header font={font} />
                        </div>
                        <SavedLocationRoute
                            unitSystem={unitSystem}
                            showUtilityBar={showUtilityBar}
                            utilityBarStyle={utilityBarStyle}
                            mapRotation={mapRotation}
                            mapTilt={mapTilt}
                            onSaveLocation={handleSaveLocation}
                            onDeleteSavedLocation={handleDeleteSavedLocation}
                        />
                    </>
                } />

                {/* About route */}
                <Route path="/about" element={
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                        <PageMeta
                            title="About — monkeysnow"
                            description="monkeysnow is a minimalistic ski resort snow forecast app using wet-bulb snow estimation at each elevation and multi-model weather data from Open-Meteo."
                            canonical="https://monkeysnow.com/about"
                        />
                        <Header font={font} />
                        <AboutPage />
                    </div>
                } />

                {/* Settings route */}
                <Route path="/settings" element={
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                        <PageMeta
                            title="Settings — monkeysnow"
                            description="Customize monkeysnow: themes, fonts, view modes, elevation display, temperature units, and weather model preferences."
                            canonical="https://monkeysnow.com/settings"
                        />
                        <Header font={font} />
                        <SettingsPage {...settingsProps} />
                    </div>
                } />

                {/* Terms route */}
                <Route path="/terms" element={
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                        <PageMeta
                            title="Terms of Use — monkeysnow"
                            description="Terms of use for monkeysnow, a free ski resort snow forecast application."
                            canonical="https://monkeysnow.com/terms"
                        />
                        <Header font={font} />
                        <TermsPage />
                    </div>
                } />

                {/* Privacy route */}
                <Route path="/privacy" element={
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                        <PageMeta
                            title="Privacy Policy — monkeysnow"
                            description="Privacy policy for monkeysnow. We do not collect personal data."
                            canonical="https://monkeysnow.com/privacy"
                        />
                        <Header font={font} />
                        <PrivacyPage />
                    </div>
                } />

                {/* Catch-all redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Footer - pinned on wide screens; on phones it ends the page instead of covering the cards */}
            <footer className="md:fixed md:bottom-2 left-0 right-0 px-4 pb-6 md:pb-0 text-xs text-theme-textSecondary z-10 flex flex-wrap items-center justify-evenly gap-x-3 gap-y-2">
                <a
                    href="https://github.com/kcluit/monkeysnow"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 opacity-40 hover:opacity-100 hover:text-theme-textPrimary transition-all"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    github
                </a>
                <Link to="/terms" className="flex items-center gap-1.5 opacity-40 hover:opacity-100 hover:text-theme-textPrimary transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    terms
                </Link>
                <Link to="/privacy" className="flex items-center gap-1.5 opacity-40 hover:opacity-100 hover:text-theme-textPrimary transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    privacy
                </Link>
                <a
                    href="https://ko-fi.com/kcluit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 opacity-40 hover:opacity-100 hover:text-theme-textPrimary transition-all"
                >
                    <FontAwesomeIcon icon={icons.donate} style={{ width: 14, height: 14 }} />
                    donate
                </a>
                <button
                    onClick={() => commandPalette.openToCommand('theme')}
                    className="flex items-center gap-1.5 opacity-40 hover:opacity-100 hover:text-theme-textPrimary transition-all cursor-pointer"
                >
                    <FontAwesomeIcon icon={icons.palette} style={{ width: 14, height: 14 }} />
                    {theme.name.toLowerCase()}
                </button>
            </footer>
        </div>
    );
}

export default App;

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
import { lacksLettersFor } from './types/fonts';
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
import { DEFAULT_SNOWFALL_ESTIMATE_MODE, processResortData } from './utils/weather';
import { DEFAULT_SNOW_CAUTION } from './utils/snowQuality';
import { generateControlCommands, generateDetailedViewCommands } from './utils/commandGenerators';
import { icons } from './constants/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { setGlobalZoomSync } from './lib/charts/chartRegistry';
import { getSortDayData, historySortDayWithin } from './utils/sortDayHelpers';
import { historyFetchDays, lastDaysOf } from './utils/resortForecast';
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
    defaultHistoryLength,
} from './utils/constants';
import type {
    AllWeatherData,
    ElevationLevel,
    SortOption,
    SortDay,
    ProcessedResortData,
    Command,
    ViewMode,
    TemperatureMetric,
    SnowfallEstimateMode,
    SnowCaution,
    UtilityBarStyle,
    ResortDisplayLimit,
} from './types';

/** What the forecast or History fetches while the other is on show */
const NO_RESORTS: string[] = [];

interface DetailRouteProps {
    unitSystem: 'metric' | 'imperial';
    showUtilityBar: boolean;
    utilityBarStyle: UtilityBarStyle;
    mapRotation: MapRotation;
    mapTilt: MapTilt;
    onSaveLocation: (input: SavedLocationInput) => void;
    /** History's switch and History length, one for the Main page and the Detailed view */
    isHistory: boolean;
    setIsHistory: (on: boolean) => void;
    historyLength: number;
    setHistoryLength: (days: number) => void;
}

// Resort Detail Page wrapper component
function ResortDetailRoute({
    unitSystem,
    showUtilityBar,
    utilityBarStyle,
    mapRotation,
    mapTilt,
    onSaveLocation,
    isHistory,
    setIsHistory,
    historyLength,
    setHistoryLength,
    getDisplayName,
}: DetailRouteProps & {
    getDisplayName: (id: string) => string;
}): JSX.Element | null {
    const { resortId: requestedId } = useParams<{ resortId: string }>();
    const navigate = useNavigate();
    const { t } = useLanguage();

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
        title: displayName ? t('app.meta.resortTitle', { name: displayName }) : t('app.meta.homeTitle'),
        description: displayName
            ? t('app.meta.resortDescription', { name: displayName })
            : t('app.meta.shortDescription'),
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
        <Suspense fallback={<div className="text-center py-12 text-theme-textSecondary">{t('app.loadingCharts')}</div>}>
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
                isHistory={isHistory}
                setIsHistory={setIsHistory}
                historyLength={historyLength}
                setHistoryLength={setHistoryLength}
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
    isHistory,
    setIsHistory,
    historyLength,
    setHistoryLength,
}: DetailRouteProps & {
    onDeleteSavedLocation: (id: string) => void;
}): JSX.Element | null {
    const { locationKey } = useParams<{ locationKey: string }>();
    const navigate = useNavigate();
    const { pathname, state } = useLocation();
    const { t } = useLanguage();
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
        title: savedLocation ? t('app.meta.resortTitle', { name: savedLocation.name }) : t('app.meta.homeTitle'),
        description: t('app.meta.shortDescription'),
        canonical: 'https://monkeysnow.com/',
    });

    // Another browser, or deleted
    if (!savedLocation || !viewLocation) {
        return <Navigate to="/" replace />;
    }

    return (
        <Suspense fallback={<div className="text-center py-12 text-theme-textSecondary">{t('app.loadingCharts')}</div>}>
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
                isHistory={isHistory}
                setIsHistory={setIsHistory}
                historyLength={historyLength}
                setHistoryLength={setHistoryLength}
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
    const { t, tPlural, language, setLanguage, availableLanguages } = useLanguage();
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

    // History is never remembered, so every visit opens on the forecast; the History length is
    const [isHistory, setIsHistory] = useState(false);
    const [historyLength, setHistoryLength] = useLocalStorage<number>('historyLength', defaultHistoryLength);

    // Weather data hooks — keep the selection's forecasts, or its History, loaded within the
    // Fetch budget, with the hours that Graph view draws. Only the one on show fetches;
    // the other keeps what it has for switching back
    const forecast = useWeatherData(isHistory ? NO_RESORTS : selectedResorts, viewMode === 'graph');
    const history = useWeatherData(isHistory ? selectedResorts : NO_RESORTS, viewMode === 'graph', historyFetchDays(historyLength));
    const { loading: weatherLoading, error: weatherError, queuedCount, queuedCalls, createLoadingController, cancelLoading } = isHistory ? history : forecast;

    // History cut to the History length, which can be shorter than the days it was fetched for
    const historyWeatherData = history.allWeatherData;
    const allWeatherData = useMemo((): AllWeatherData | null => {
        if (!isHistory) return forecast.allWeatherData;
        if (!historyWeatherData) return null;
        const data = Object.fromEntries(
            Object.entries(historyWeatherData.data).map(([id, resortData]) => [id, lastDaysOf(resortData, historyLength)])
        );
        return { ...historyWeatherData, data, historyLength };
    }, [isHistory, forecast.allWeatherData, historyWeatherData, historyLength]);

    // Block UI while the Starter resort is picked, and if there is NO cached forecast at all,
    // but not through a rate-limit pause (that can last until tomorrow; the home page
    // explains it in its status row), nor on History, which keeps the utility bar to switch it off
    const fetchPause = useBudgetPause();
    const loading = !hasInitialized || (!isHistory && !fetchPause && ((!allWeatherData && weatherLoading) || (!allWeatherData && hierarchyLoading)));
    const [selectedElevation, setSelectedElevation] = useLocalStorage<ElevationLevel>('selectedElevation', defaultElevation);
    const [selectedSort, setSelectedSort] = useLocalStorage<SortOption>('selectedSort', defaultSort);
    const [forecastSortDay, setForecastSortDay] = useLocalStorage<SortDay>('selectedSortDay', defaultSortDay);
    // History keeps its own sort day, since its days are other days
    const [historySortDay, setHistorySortDay] = useLocalStorage<SortDay>('historySortDay', defaultSortDay);
    const selectedSortDay = isHistory ? historySortDayWithin(historySortDay, historyLength) : forecastSortDay;
    const setSelectedSortDay = isHistory ? setHistorySortDay : setForecastSortDay;
    const [isReversed, setIsReversed] = useLocalStorage<boolean>('reverseOrder', false);
    const [showUtilityBar, setShowUtilityBar] = useLocalStorage<boolean>('showUtilityBar', true);
    const [utilityBarStyle, setUtilityBarStyle] = useLocalStorage<UtilityBarStyle>('utilityBarStyle', 'large');

    // Local component state
    const [selectedTemperatureMetric, setSelectedTemperatureMetric] = useLocalStorage<TemperatureMetric>('temperatureMetric', defaultTemperatureMetric);
    const [snowfallEstimateMode, setSnowfallEstimateMode] = useLocalStorage<SnowfallEstimateMode>('snowfallEstimateMode', DEFAULT_SNOWFALL_ESTIMATE_MODE);
    const [snowCaution, setSnowCaution] = useLocalStorage<SnowCaution>('snowCaution', DEFAULT_SNOW_CAUTION);
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

    // Sort day options for the utility bars, settings and command palette, named in the language showing
    const sortDayData = useMemo(
        () => getSortDayData(selectedResorts, allWeatherData, processResortData, selectedElevation, isShowDateEnabled, isHistory ? historyLength : undefined),
        [selectedResorts, allWeatherData, selectedElevation, isShowDateEnabled, isHistory, historyLength, language]
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
        isHistory, historyLength, setHistoryLength,
        selectedTemperatureMetric, setSelectedTemperatureMetric,
        snowfallEstimateMode, setSnowfallEstimateMode,
        snowCaution, setSnowCaution,
        openCardModels,
        showUtilityBar, setShowUtilityBar,
        utilityBarStyle, setUtilityBarStyle,
        unitSystem, setUnitSystem,
        resortDisplayLimit, setResortDisplayLimit,
        openResortModalAndDismissBanner,
        // Every command's name is in the language showing
        language.id, t, setLanguage, availableLanguages,
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
                name: t('command.theme'),
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
                name: t('command.font'),
                icon: icons.font,
                subCommands: availableFonts.map((f) => ({
                    id: `font-${f.id}`,
                    name: lacksLettersFor(f, language.script) ? `${f.name} · ${t('font.missingLetters')}` : f.name,
                    icon: f.isMonospace ? icons.monospace : icons.regular,
                    action: () => setFont(f.id),
                })),
            },
            {
                id: 'rainbow',
                name: t('command.rainbowText'),
                icon: icons.rainbow,
                subCommands: [
                    {
                        id: 'rainbow-on',
                        name: t('common.on'),
                        icon: isRainbowEnabled ? icons.check : undefined,
                        action: () => setRainbowEnabled(true),
                    },
                    {
                        id: 'rainbow-off',
                        name: t('common.off'),
                        icon: !isRainbowEnabled ? icons.check : undefined,
                        action: () => setRainbowEnabled(false),
                    },
                ],
            },
            {
                id: 'bold-text',
                name: t('command.boldText'),
                icon: icons.bold,
                subCommands: [
                    {
                        id: 'bold-text-on',
                        name: t('common.on'),
                        icon: isBoldTextEnabled ? icons.check : undefined,
                        action: () => setBoldTextEnabled(true),
                    },
                    {
                        id: 'bold-text-off',
                        name: t('common.off'),
                        icon: !isBoldTextEnabled ? icons.check : undefined,
                        action: () => setBoldTextEnabled(false),
                    },
                ],
            },
            {
                id: 'fullscreen',
                name: t('command.fullscreen'),
                icon: icons.fullscreen,
                shortcut: 'F11',
                subCommands: [
                    {
                        id: 'fullscreen-on',
                        name: t('common.on'),
                        icon: isFullscreen ? icons.check : undefined,
                        action: enterFullscreen,
                    },
                    {
                        id: 'fullscreen-off',
                        name: t('common.off'),
                        icon: !isFullscreen ? icons.check : undefined,
                        action: exitFullscreen,
                    },
                ],
            },
            {
                id: 'fps',
                name: t('command.fpsCounter'),
                icon: icons.fps,
                subCommands: [
                    {
                        id: 'fps-on',
                        name: t('common.on'),
                        icon: isFPSEnabled ? icons.check : undefined,
                        action: () => setFPSEnabled(true),
                    },
                    {
                        id: 'fps-off',
                        name: t('common.off'),
                        icon: !isFPSEnabled ? icons.check : undefined,
                        action: () => setFPSEnabled(false),
                    },
                ],
            },
            {
                id: 'show-borders',
                name: t('command.showBorders'),
                icon: icons.borders,
                subCommands: [
                    {
                        id: 'show-borders-on',
                        name: t('common.on'),
                        icon: !isHideBordersEnabled ? icons.check : undefined,
                        action: () => setHideBordersEnabled(false),
                    },
                    {
                        id: 'show-borders-off',
                        name: t('common.off'),
                        icon: isHideBordersEnabled ? icons.check : undefined,
                        action: () => setHideBordersEnabled(true),
                    },
                ],
            },
            {
                id: 'show-date',
                name: t('command.showDate'),
                icon: icons.date,
                subCommands: [
                    {
                        id: 'show-date-on',
                        name: t('common.on'),
                        icon: isShowDateEnabled ? icons.check : undefined,
                        action: () => setShowDateEnabled(true),
                    },
                    {
                        id: 'show-date-off',
                        name: t('common.off'),
                        icon: !isShowDateEnabled ? icons.check : undefined,
                        action: () => setShowDateEnabled(false),
                    },
                ],
            },
            {
                id: 'chart-zoom-sync',
                name: t('command.syncCharts'),
                icon: icons.link,
                subCommands: [
                    {
                        id: 'chart-zoom-sync-on',
                        name: t('common.on'),
                        icon: chartZoomSyncEnabled ? icons.check : undefined,
                        action: () => setChartZoomSyncEnabled(true),
                    },
                    {
                        id: 'chart-zoom-sync-off',
                        name: t('common.off'),
                        icon: !chartZoomSyncEnabled ? icons.check : undefined,
                        action: () => setChartZoomSyncEnabled(false),
                    },
                ],
            },
            {
                id: 'map-rotation',
                name: t('command.mapRotation'),
                icon: icons.rotate,
                subCommands: [
                    {
                        id: 'map-rotation-linear',
                        name: t('command.mapRotation.linear'),
                        icon: mapRotation === 'linear' ? icons.check : undefined,
                        action: () => setMapRotation('linear'),
                    },
                    {
                        id: 'map-rotation-linear-reversed',
                        name: t('command.mapRotation.linearReversed'),
                        icon: mapRotation === 'linearReversed' ? icons.check : undefined,
                        action: () => setMapRotation('linearReversed'),
                    },
                    {
                        id: 'map-rotation-orbital',
                        name: t('command.mapRotation.orbital'),
                        icon: mapRotation === 'orbital' ? icons.check : undefined,
                        action: () => setMapRotation('orbital'),
                    },
                ],
            },
            {
                id: 'map-tilt',
                name: t('command.mapTilt'),
                icon: icons.tilt,
                subCommands: [
                    {
                        id: 'map-tilt-drag-up',
                        name: t('command.mapTilt.dragUp'),
                        icon: mapTilt === 'dragUp' ? icons.check : undefined,
                        action: () => setMapTilt('dragUp'),
                    },
                    {
                        id: 'map-tilt-drag-down',
                        name: t('command.mapTilt.dragDown'),
                        icon: mapTilt === 'dragDown' ? icons.check : undefined,
                        action: () => setMapTilt('dragDown'),
                    },
                ],
            },
            ...detailedViewCommands,
            {
                id: 'slope-bands',
                name: t('command.slopeBands'),
                icon: icons.slopeBands,
                action: openSlopeBands,
            },
            {
                id: 'cursor-readout',
                name: t('command.cursorReadout'),
                icon: icons.cursor,
                subCommands: [
                    {
                        id: 'cursor-readout-on',
                        name: t('common.on'),
                        icon: cursorReadoutShown ? icons.check : undefined,
                        action: () => setCursorReadoutShown(true),
                    },
                    {
                        id: 'cursor-readout-off',
                        name: t('common.off'),
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
            isHistory,
            setIsHistory,
            historyLength,
            setHistoryLength,
            selectedTemperatureMetric,
            setSelectedTemperatureMetric,
            snowfallEstimateMode,
            setSnowfallEstimateMode,
            snowCaution,
            setSnowCaution,
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

    // Load resort data, its days and weather named in the language showing
    const loadResort = useCallback(async (resortName: string): Promise<boolean> => {
        if (!allWeatherData) return false;

        try {
            const data = processResortData(allWeatherData, resortName, selectedElevation, selectedTemperatureMetric, snowfallEstimateMode, unitSystem, snowCaution);

            if (data) {
                data.name = getDisplayName(resortName);
                setResortData(prev => new Map(prev.set(resortName, data)));
            }
            return true;
        } catch (err) {
            console.warn(`Failed to load ${resortName}:`, err);
            return false;
        }
    }, [allWeatherData, selectedElevation, selectedTemperatureMetric, snowfallEstimateMode, unitSystem, snowCaution, getDisplayName, language]);

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
                unitSystem,
                snowCaution
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
        snowCaution,
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
            unitSystem,
            snowCaution
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
        snowCaution,
        resortData,
        sortResorts,
        effectiveDisplayLimit
    ]);

    const isTruncated = effectiveDisplayLimit > 0 && selectedResorts.length > effectiveDisplayLimit;

    // Forecasts failed to load and nothing cached — error state (History says so under its utility bar instead)
    if (isHomePage && !isHistory && !allWeatherData && weatherError) {
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

    // The first-visit banner's sentence, around its Select Resorts button wherever the language puts it
    const [bannerBefore, bannerAfter = ''] = tPlural('app.banner', selectedResorts.length, { total: skiResorts.length }).split('{button}');

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
                        isHistory={isHistory}
                        setIsHistory={setIsHistory}
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
                        isHistory={isHistory}
                        setIsHistory={setIsHistory}
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
                        {bannerBefore}<button onClick={openResortModalAndDismissBanner} className="underline text-theme-textPrimary hover:text-theme-accent transition-colors">{t('app.banner.selectResorts')}</button>{bannerAfter}
                    </span>
                    <button
                        onClick={() => setBannerDismissed(true)}
                        className="shrink-0 p-1 rounded-md hover:bg-theme-border transition-colors text-theme-textSecondary hover:text-theme-textPrimary"
                        aria-label={t('app.banner.dismiss')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            )}

            <div className={viewMode === 'compact' ? "compact-grid" : "space-y-8"}>
                <Suspense fallback={<div className="text-center py-4 text-theme-textSecondary">{t('common.loading')}</div>}>
                    {viewMode === 'graph' && allWeatherData ? (
                        <GraphView
                            // Switching History opens the Graphs on their 5 days again
                            key={isHistory ? 'history' : 'forecast'}
                            resorts={displayResorts}
                            allWeatherData={allWeatherData}
                            elevation={selectedElevation}
                            snowfallMode={snowfallEstimateMode}
                            snowCaution={snowCaution}
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

                {isHistory && !allWeatherData && weatherError && (
                    <div className="text-center py-3 text-sm text-theme-textSecondary">{t('error.loadingWeatherData')}</div>
                )}

                {isTruncated && (
                    <div className="text-center py-3 text-sm text-theme-textSecondary">
                        {t('app.truncated', { shown: effectiveDisplayLimit, total: selectedResorts.length })}
                    </div>
                )}

                {/* Ghost "Add more resorts" card */}
                {selectedResorts.length > 0 && (
                    <button
                        onClick={openResortModalAndDismissBanner}
                        className={`w-full border-2 border-dashed border-theme-border rounded-${viewMode === 'compact' ? 'xl' : '2xl'} ${viewMode === 'compact' ? 'p-6' : 'p-8'} flex flex-col items-center justify-center gap-2 text-theme-textSecondary hover:text-theme-textPrimary hover:border-theme-textSecondary hover:bg-theme-secondary transition-all duration-200 cursor-pointer group`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width={viewMode === 'compact' ? 24 : 32} height={viewMode === 'compact' ? 24 : 32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:opacity-100 transition-opacity"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <span className={`${viewMode === 'compact' ? 'text-sm' : 'text-base'} font-medium`}>{t('app.addMoreResorts')}</span>
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
        isHistory,
        setIsHistory,
        historyLength,
        setHistoryLength,
        selectedTemperatureMetric,
        setSelectedTemperatureMetric,
        snowfallEstimateMode,
        setSnowfallEstimateMode,
        snowCaution,
        setSnowCaution,
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
                {t('app.attribution')}
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
                            title={t('app.meta.homeTitle')}
                            description={t('app.meta.homeDescription')}
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
                            isHistory={isHistory}
                            setIsHistory={setIsHistory}
                            historyLength={historyLength}
                            setHistoryLength={setHistoryLength}
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
                            isHistory={isHistory}
                            setIsHistory={setIsHistory}
                            historyLength={historyLength}
                            setHistoryLength={setHistoryLength}
                        />
                    </>
                } />

                {/* About route */}
                <Route path="/about" element={
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                        <PageMeta
                            title={t('app.meta.aboutTitle')}
                            description={t('app.meta.aboutDescription')}
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
                            title={t('app.meta.settingsTitle')}
                            description={t('app.meta.settingsDescription')}
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
                            title={t('app.meta.termsTitle')}
                            description={t('app.meta.termsDescription')}
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
                            title={t('app.meta.privacyTitle')}
                            description={t('app.meta.privacyDescription')}
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
                {/* Named in itself, so a visitor who can't read the page still finds their language */}
                <button
                    onClick={() => commandPalette.openToCommand('language')}
                    title={t('footer.language')}
                    className="flex items-center gap-1.5 opacity-40 hover:opacity-100 hover:text-theme-textPrimary transition-all cursor-pointer"
                >
                    <FontAwesomeIcon icon={icons.language} style={{ width: 14, height: 14 }} />
                    {language.nativeName.toLowerCase()}
                </button>
                <Link to="/privacy" className="flex items-center gap-1.5 opacity-40 hover:opacity-100 hover:text-theme-textPrimary transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    {t('footer.privacy')}
                </Link>
                <a
                    href="https://ko-fi.com/kcluit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 opacity-40 hover:opacity-100 hover:text-theme-textPrimary transition-all"
                >
                    <FontAwesomeIcon icon={icons.donate} style={{ width: 14, height: 14 }} />
                    {t('footer.donate')}
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

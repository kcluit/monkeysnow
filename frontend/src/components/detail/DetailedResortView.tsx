import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelectedModels, useSelectedAggregations } from '../../hooks/useSelectedModels';
import { useDetailElevation, useForecastHorizon, useLockedCharts, useShownCharts } from '../../hooks/useDetailedViewSettings';
import { useDetailedWeatherData } from '../../hooks/useDetailedWeatherData';
import { useBudgetPause } from '../../hooks/useBudgetPause';
import { useModelHierarchy } from '../../hooks/useModelHierarchy';
import { useLanguage } from '../../hooks/useLanguage';
import { FetchStatus } from '../FetchStatus';
import { DetailUtilityBar } from './DetailUtilityBar';
import { DetailChartGrid } from './DetailChartGrid';
import { SavedLocationDialog } from './SavedLocationDialog';
import { ModelSelectionGridModal } from '../ModelSelectionModal';
import { ResortMap } from '../map/ResortMap';
import { suggestedName, updateSavedLocation, type SavedLocationInput } from '../../utils/savedLocations';
import { MAX_SELECTED_RESORTS } from '../../hooks/useResortHierarchy';
import { RESORT_LOCATIONS } from '../../data/resortLocations';
import { coversPoint, inCatalogueOrder, isKnownModel } from '../../data/modelHierarchy';
import { resolveComparisonModels } from '../../utils/comparisonModels';
import { registerModelStylesOpener } from '../../utils/modelStyles';
import { detailedViewModelsOpener } from '../../utils/openerRegistry';
import { buildTimeAxis } from '../../utils/timeAxis';
import { lastDaysOfHistory } from '../../utils/openMeteoClient';
import { historyFetchDays } from '../../utils/resortForecast';
import { HistoryBadge } from '../cards/HistoryBadge';
import { clearHeldLines } from '../../lib/charts/chartRegistry';
import type { DetailedResortViewProps, CustomLocation } from '../../types/detailView';
import type { WeatherModel, WeatherVariable } from '../../types/openMeteo';
import type { ChartSettingsTab } from '../../types/chartSettings';
import type { UnitSystem } from '../../types';
import { formatElevation } from '../../utils/unitConversion';
import type { HeightLine } from '../../utils/heightLines';
import type { MapRotation, MapTilt } from '../../utils/mapRotation';
import { formatDecimal, interpolate } from '../../locales';

interface DetailedResortViewPropsWithUnits extends DetailedResortViewProps {
    unitSystem: UnitSystem;
    showUtilityBar: boolean;
    utilityBarStyle: import('../../types').UtilityBarStyle;
    /** How a right-drag turns and tilts the 3D map */
    mapRotation: MapRotation;
    mapTilt: MapTilt;
    onBack: () => void;
    /** Keeps the Custom location being shown as a new Saved location */
    onSaveLocation: (input: SavedLocationInput) => void;
    /** Deletes this view's Saved location */
    onDeleteSavedLocation?: (id: string) => void;
    /** Set right after saving, when the Selection was already full */
    selectionWasFull?: boolean;
    onDismissSelectionWasFull?: () => void;
    /** History's switch and History length, one for the Main page and the Detailed view */
    isHistory: boolean;
    setIsHistory: (on: boolean) => void;
    historyLength: number;
    setHistoryLength: (days: number) => void;
}

/** What the forecast or History fetches while the other is on show */
const NO_MODELS: WeatherModel[] = [];

/** Shown in place of the charts when there is nothing to draw, with a way to pick other models. */
function NoChartsNotice({ message, actionLabel, onAction }: {
    message: string;
    actionLabel: string;
    onAction: () => void;
}): JSX.Element {
    return (
        <div className="text-center py-12">
            <div className="text-theme-textSecondary text-lg">{message}</div>
            <button
                onClick={onAction}
                className="mt-4 px-4 py-2 rounded-lg bg-theme-accent text-theme-background hover:opacity-90 transition-opacity"
            >
                {actionLabel}
            </button>
        </div>
    );
}

export function DetailedResortView({
    resortId,
    resortName,
    location,
    savedLocation,
    unitSystem,
    showUtilityBar,
    utilityBarStyle,
    mapRotation,
    mapTilt,
    onBack,
    onSaveLocation,
    onDeleteSavedLocation,
    selectionWasFull = false,
    onDismissSelectionWasFull,
    isHistory,
    setIsHistory,
    historyLength,
    setHistoryLength,
}: DetailedResortViewPropsWithUnits): JSX.Element {
    const { t } = useLanguage();
    // One of the heading's facts, e.g. "Lat: 50.1150"
    const field = (label: string, value: string) => t('detail.field', { label, value });

    const [selectedModels, setSelectedModels] = useSelectedModels();
    const [selectedVariables, setSelectedVariables] = useShownCharts();
    const [selectedAggregations, setSelectedAggregations] = useSelectedAggregations();
    const [elevationSelection, setElevationSelection] = useDetailElevation();

    // Resolve the elevation selection to an actual number based on current resort
    const resolvedElevation = useMemo(() => {
        // A Saved location is only ever forecast at its own elevation
        if (savedLocation) {
            return savedLocation.elevation;
        }
        if (typeof elevationSelection === 'number') {
            return elevationSelection;
        }
        switch (elevationSelection) {
            case 'base': return location.baseElevation;
            case 'mid': return location.midElevation;
            case 'top': return location.topElevation;
            default: return location.midElevation;
        }
    }, [savedLocation, elevationSelection, location.baseElevation, location.midElevation, location.topElevation]);

    const [forecastDays, setForecastDays] = useForecastHorizon();
    const [isChartLocked, setIsChartLocked] = useLockedCharts();

    // Custom location state (temporary - NOT persisted unless saved as a Saved location)
    const [customLocation, setCustomLocation] = useState<CustomLocation | null>(null);
    // A height typed for this one Custom location, or null to forecast it at its Ground elevation
    const [customElevation, setCustomElevation] = useState<number | null>(null);
    // Open-Meteo reports back whatever height it is asked for, so the Ground elevation is kept from before one was typed
    const [rememberedGroundElevation, setRememberedGroundElevation] = useState<number | null>(null);

    // A click on the map forecasts that point at its own Ground elevation
    const handleMapClick = useCallback((lat: number, lon: number) => {
        setCustomLocation({ lat, lon });
        setCustomElevation(null);
        setRememberedGroundElevation(null);
    }, []);

    // Reset custom location to return to original resort
    const handleResetCustomLocation = useCallback(() => {
        setCustomLocation(null);
        setCustomElevation(null);
        setRememberedGroundElevation(null);
    }, []);

    // Save and Edit dialogs, and the in-page confirmation before deleting a Saved location
    const [dialog, setDialog] = useState<'save' | 'edit' | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const closeDialog = useCallback(() => setDialog(null), []);

    // Compute effective coordinates for weather data
    const effectiveCoords = useMemo(() => {
        if (customLocation) {
            return { lat: customLocation.lat, lon: customLocation.lon };
        }
        return { lat: location.lat, lon: location.lon };
    }, [customLocation, location.lat, location.lon]);

    // Held lines last while this point is shown: another point may have other Comparison models
    useEffect(() => () => clearHeldLines(), [effectiveCoords.lat, effectiveCoords.lon]);

    // Toggle variable visibility (for the eye icon on each chart)
    const toggleVariable = useCallback((variable: WeatherVariable) => {
        // Don't allow removing the last variable
        if (selectedVariables.length > 1) {
            setSelectedVariables(selectedVariables.filter((v) => v !== variable));
        }
    }, [selectedVariables, setSelectedVariables]);

    // Only fetch Selected models whose Coverage includes the point being forecast
    const coveringModels = useMemo(
        () => inCatalogueOrder(
            selectedModels.filter((model) =>
                isKnownModel(model) && coversPoint(model, effectiveCoords.lat, effectiveCoords.lon)
            )
        ),
        [selectedModels, effectiveCoords.lat, effectiveCoords.lon]
    );

    // Fetch the forecast, or History, at the effective coordinates. Only the one on show fetches;
    // the other keeps what it has for switching back
    const point = {
        latitude: effectiveCoords.lat,
        longitude: effectiveCoords.lon,
        // Left out for a Custom location with no Custom elevation: Open-Meteo forecasts it at its Ground elevation and reports that back
        elevation: customLocation ? customElevation ?? undefined : resolvedElevation,
        variables: selectedVariables,
        forecastDays,
    };
    const forecast = useDetailedWeatherData({ ...point, models: isHistory ? NO_MODELS : coveringModels });
    const history = useDetailedWeatherData({
        ...point,
        models: isHistory ? coveringModels : NO_MODELS,
        historyDays: historyFetchDays(historyLength),
    });
    const { data: shownData, unavailableModels, loadingModels, timezoneInfo } = isHistory ? history : forecast;
    // History cut to the History length, which can be shorter than the days it was fetched for
    const data = useMemo(
        () => (isHistory ? lastDaysOfHistory(shownData, historyLength, timezoneInfo?.timezone) : shownData),
        [isHistory, shownData, historyLength, timezoneInfo?.timezone]
    );
    // Both are for the same point and height, so either one's will do until the one on show has arrived
    const forecastElevation = isHistory ? history.elevation ?? forecast.elevation : forecast.elevation ?? history.elevation;
    const reportedGroundElevation = customElevation === null ? forecastElevation : null;
    const groundElevation = customLocation ? reportedGroundElevation ?? rememberedGroundElevation : null;
    // The height a Custom location is forecast at, once known
    const customLocationElevation = customElevation ?? groundElevation;

    const handleCustomElevationChange = useCallback((elevation: number | null) => {
        if (reportedGroundElevation !== null) {
            setRememberedGroundElevation(reportedGroundElevation);
        }
        setCustomElevation(elevation);
    }, [reportedGroundElevation]);

    // e.g. "2100m (ground 1845m)" while a Custom elevation is forecast; null until the height is known
    const customLocationElevationText = customLocationElevation === null
        ? null
        : groundElevation !== null && groundElevation !== customLocationElevation
            ? t('detail.elevationWithGround', {
                elevation: formatElevation(customLocationElevation, unitSystem),
                ground: formatElevation(groundElevation, unitSystem),
            })
            : formatElevation(customLocationElevation, unitSystem);

    // The 3D map draws a Height line at each Elevation band of a Resort, or at the one height of a Saved location
    // or Custom location; the one the charts are for is bold
    const heightLines = useMemo((): HeightLine[] => {
        const single = (elevation: number): HeightLine[] =>
            [{ elevation, label: formatElevation(elevation, unitSystem), bold: true }];
        if (customLocation) return customLocationElevation === null ? [] : single(customLocationElevation);
        if (savedLocation) return single(savedLocation.elevation);
        const bands = [
            { selection: 'base', elevation: location.baseElevation, template: t('map.heightLineBase') },
            { selection: 'mid', elevation: location.midElevation, template: t('map.heightLineMid') },
            { selection: 'top', elevation: location.topElevation, template: t('map.heightLineTop') },
        ].map(({ selection, elevation, template }): HeightLine => ({
            elevation,
            label: interpolate(template, { height: formatElevation(elevation, unitSystem) }),
            bold: elevationSelection === selection,
        }));
        return typeof elevationSelection === 'number' ? [...bands, ...single(elevationSelection)] : bands;
    }, [
        customLocation, customLocationElevation, savedLocation, elevationSelection, unitSystem, t,
        location.baseElevation, location.midElevation, location.topElevation,
    ]);

    // Drop models that came back empty and Clones, leaving the Comparison models
    const { comparisonModels, dropped } = useMemo(
        () => resolveComparisonModels(coveringModels, data, unavailableModels),
        [coveringModels, data, unavailableModels]
    );

    const modelAvailability = useMemo(() => ({
        point: effectiveCoords,
        droppedModels: dropped,
        shownModelCount: comparisonModels.length,
    }), [effectiveCoords, dropped, comparisonModels.length]);

    // The Models modal lives here rather than in the utility bar, so the notices below can open it too
    const modelHierarchy = useModelHierarchy({
        selectedModels,
        onModelsChange: setSelectedModels,
        selectedAggregations,
        onAggregationsChange: setSelectedAggregations,
    });
    // The command palette opens this one while the Detailed view is showing, as it knows the point being forecast
    const openModels = modelHierarchy.openModal;
    useEffect(() => detailedViewModelsOpener.register(openModels), [openModels]);

    // One time axis for every chart, spanning the Comparison models' forecasts
    const axisRange = useMemo(() => {
        let start = Infinity;
        let end = -Infinity;
        for (const model of comparisonModels) {
            const points = data.get(model);
            if (!points || points.length === 0) continue;
            start = Math.min(start, points[0].timestamp);
            end = Math.max(end, points[points.length - 1].timestamp);
        }
        return start <= end ? { start, end } : null;
    }, [data, comparisonModels]);
    const axisStart = axisRange?.start;
    const axisEnd = axisRange?.end;
    const timezone = timezoneInfo?.timezone;
    const timeAxis = useMemo(
        () => (axisStart !== undefined && axisEnd !== undefined ? buildTimeAxis(axisStart, axisEnd, timezone) : null),
        [axisStart, axisEnd, timezone]
    );

    // During a rate-limit pause, say how many models are still waiting instead of a bare spinner
    const pause = useBudgetPause();
    const pendingModels = coveringModels.filter((model) => loadingModels.has(model)).length;
    const isLoading = pendingModels > 0;
    const showsCharts = coveringModels.length > 0 && (isLoading || comparisonModels.length > 0);

    // The chart whose gear modal is open, and the tab to open it on (left out: the one last used)
    const [openChartSettings, setOpenChartSettings] = useState<{ variable: WeatherVariable; tab?: ChartSettingsTab } | null>(null);
    const handleOpenChartSettings = useCallback((variable: WeatherVariable) => setOpenChartSettings({ variable }), []);
    const handleCloseChartSettings = useCallback(() => setOpenChartSettings(null), []);

    // While charts are shown, the model picker and the command palette open the Models tab in the first one's gear modal
    const firstVariable = selectedVariables[0];
    useEffect(() => {
        if (!showsCharts || !firstVariable) return;
        return registerModelStylesOpener(() => setOpenChartSettings({ variable: firstVariable, tab: 'models' }));
    }, [showsCharts, firstVariable]);

    return (
        <div>
            {/* Resort Map */}
            <div className="mb-6 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
                <ResortMap
                    key={`${location.lat}-${location.lon}`}
                    lat={location.lat}
                    lon={location.lon}
                    resortName={resortName}
                    onMapClick={handleMapClick}
                    customLocation={customLocation}
                    customElevationText={customLocationElevationText}
                    country={savedLocation?.country ?? RESORT_LOCATIONS.get(resortId)?.country}
                    unitSystem={unitSystem}
                    heightLines={heightLines}
                    rotation={mapRotation}
                    tilt={mapTilt}
                />
            </div>

            {/* Header */}
            <div className="mb-6 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-theme-textPrimary">
                        {customLocation ? t('detail.customLocation') : resortName}
                    </h1>
                    {isHistory && <HistoryBadge days={historyLength} />}
                    {customLocation && (
                        <>
                            <button
                                onClick={() => setDialog('save')}
                                className="px-3 py-1 text-sm rounded-lg bg-theme-secondary hover:bg-theme-cardBg transition-colors text-theme-accent"
                            >
                                {t('detail.saveLocation')}
                            </button>
                            <button
                                onClick={handleResetCustomLocation}
                                className="px-3 py-1 text-sm rounded-lg bg-theme-secondary hover:bg-theme-cardBg transition-colors text-theme-accent flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>{t('detail.resetTo', { name: resortName })}</span>
                            </button>
                        </>
                    )}
                    {savedLocation && !customLocation && (confirmingDelete ? (
                        <div className="flex items-center gap-2 text-sm" role="alert">
                            <span className="text-theme-textSecondary">{t('detail.confirmDelete', { name: savedLocation.name })}</span>
                            <button
                                onClick={() => onDeleteSavedLocation?.(savedLocation.id)}
                                className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors text-red-500"
                            >
                                {t('detail.delete')}
                            </button>
                            <button
                                onClick={() => setConfirmingDelete(false)}
                                className="px-3 py-1 rounded-lg bg-theme-secondary hover:bg-theme-cardBg transition-colors text-theme-textSecondary"
                            >
                                {t('detail.cancel')}
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => setDialog('edit')}
                                className="px-3 py-1 text-sm rounded-lg bg-theme-secondary hover:bg-theme-cardBg transition-colors text-theme-accent"
                            >
                                {t('detail.edit')}
                            </button>
                            <button
                                onClick={() => setConfirmingDelete(true)}
                                className="px-3 py-1 text-sm rounded-lg bg-theme-secondary hover:bg-theme-cardBg transition-colors text-red-500"
                            >
                                {t('detail.delete')}
                            </button>
                        </>
                    ))}
                </div>
                {selectionWasFull && (
                    <div className="flex items-center gap-3 mt-2 text-sm text-theme-textSecondary" role="status">
                        <span>{t('detail.selectionWasFull', { max: MAX_SELECTED_RESORTS })}</span>
                        <button
                            onClick={onDismissSelectionWasFull}
                            className="shrink-0 p-1 rounded-md hover:bg-theme-border transition-colors hover:text-theme-textPrimary"
                            aria-label={t('detail.dismissNotice')}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
                <div className="flex items-center gap-4 text-sm text-theme-textSecondary flex-wrap">
                    {customLocation ? (
                        <>
                            <span>{field(t('detail.latitude'), formatDecimal(customLocation.lat, 4))}</span>
                            <span>{field(t('detail.longitude'), formatDecimal(customLocation.lon, 4))}</span>
                            {customLocationElevationText === null ? (
                                <span className="animate-pulse">{t('detail.fetchingElevation')}</span>
                            ) : (
                                <span>{field(t('detail.elevation'), customLocationElevationText)}</span>
                            )}
                        </>
                    ) : savedLocation ? (
                        <>
                            <span>{field(t('detail.latitude'), formatDecimal(savedLocation.lat, 4))}</span>
                            <span>{field(t('detail.longitude'), formatDecimal(savedLocation.lon, 4))}</span>
                            <span>{field(t('detail.elevation'), formatElevation(savedLocation.elevation, unitSystem))}</span>
                        </>
                    ) : (
                        <>
                            <span>{field(t('detail.latitude'), formatDecimal(location.lat, 4))}</span>
                            <span>{field(t('detail.longitude'), formatDecimal(location.lon, 4))}</span>
                            <span>{field(t('band.base'), formatElevation(location.baseElevation, unitSystem))}</span>
                            <span>{field(t('band.mid'), formatElevation(location.midElevation, unitSystem))}</span>
                            <span>{field(t('band.top'), formatElevation(location.topElevation, unitSystem))}</span>
                        </>
                    )}
                    {timezoneInfo && (
                        <span>{field(t('detail.timezone'), `${timezoneInfo.timezoneAbbreviation} (${timezoneInfo.timezone})`)}</span>
                    )}
                </div>
            </div>

            {/* Utility Bar */}
            {showUtilityBar && (
                <div className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
                    <DetailUtilityBar
                        onBack={onBack}
                        unitSystem={unitSystem}
                        shownModelCount={comparisonModels.length}
                        selectedModelCount={selectedModels.length}
                        aggregationCount={selectedAggregations.length}
                        onOpenModels={modelHierarchy.openModal}
                        selectedVariables={selectedVariables}
                        setSelectedVariables={setSelectedVariables}
                        elevationSelection={elevationSelection}
                        setElevationSelection={setElevationSelection}
                        resolvedElevation={resolvedElevation}
                        forecastDays={forecastDays}
                        setForecastDays={setForecastDays}
                        isHistory={isHistory}
                        setIsHistory={setIsHistory}
                        historyLength={historyLength}
                        setHistoryLength={setHistoryLength}
                        location={location}
                        isChartLocked={isChartLocked}
                        setIsChartLocked={setIsChartLocked}
                        fixedElevation={savedLocation?.elevation}
                        customLocation={customLocation}
                        groundElevation={groundElevation}
                        customElevation={customElevation}
                        setCustomElevation={handleCustomElevationChange}
                        onResetCustomLocation={handleResetCustomLocation}
                        utilityBarStyle={utilityBarStyle}
                    />
                </div>
            )}

            {/* Charts, or why there are none */}
            {coveringModels.length === 0 ? (
                <NoChartsNotice
                    message={t('detail.noModelCovers')}
                    actionLabel={t('detail.chooseModels')}
                    onAction={modelHierarchy.openModal}
                />
            ) : !showsCharts ? (
                <NoChartsNotice
                    message={t('detail.noModelHasData')}
                    actionLabel={t('detail.chooseModels')}
                    onAction={modelHierarchy.openModal}
                />
            ) : (
                <>
                    <DetailChartGrid
                        data={data}
                        timeAxis={timeAxis}
                        comparisonModels={comparisonModels}
                        selectedVariables={selectedVariables}
                        onReorderVariables={setSelectedVariables}
                        selectedAggregations={selectedAggregations}
                        selectedModels={selectedModels}
                        modelAvailability={modelAvailability}
                        openSettings={openChartSettings}
                        onOpenSettings={handleOpenChartSettings}
                        onCloseSettings={handleCloseChartSettings}
                        unitSystem={unitSystem}
                        isChartLocked={isChartLocked}
                        isLoading={isLoading}
                        onToggleVariable={toggleVariable}
                        location={location}
                    />
                    {isLoading && (pause ? (
                        <FetchStatus
                            count={pendingModels}
                            calls={pendingModels}
                            things="models"
                            onlyWhenLimited
                            className="text-center py-2 text-sm text-theme-textSecondary"
                        />
                    ) : comparisonModels.length > 0 && (
                        <div className="text-center py-2 text-sm text-theme-textSecondary animate-pulse">
                            {t('detail.loadingMoreModels')}
                        </div>
                    ))}
                </>
            )}

            {/* Model Selection Modal */}
            <ModelSelectionGridModal
                hierarchy={modelHierarchy}
                modelAvailability={modelAvailability}
            />

            {dialog === 'save' && customLocation && (
                <SavedLocationDialog
                    title={t('detail.saveLocation')}
                    submitLabel={t('detail.savedLocation.save')}
                    initialName={suggestedName(customLocation.lat, customLocation.lon)}
                    // The height being forecast: the Custom elevation, or else the Ground elevation the forecast reported;
                    // empty for the visitor to fill if none arrives
                    initialElevation={customLocationElevation}
                    isLoadingElevation={customLocationElevation === null && isLoading}
                    unitSystem={unitSystem}
                    onSubmit={({ name, elevation }) => {
                        setDialog(null);
                        onSaveLocation({ name, elevation, lat: customLocation.lat, lon: customLocation.lon });
                    }}
                    onCancel={closeDialog}
                />
            )}
            {dialog === 'edit' && savedLocation && (
                <SavedLocationDialog
                    title={t('detail.savedLocation.editTitle')}
                    submitLabel={t('detail.savedLocation.save')}
                    initialName={savedLocation.name}
                    initialElevation={savedLocation.elevation}
                    unitSystem={unitSystem}
                    onSubmit={(changes) => {
                        setDialog(null);
                        updateSavedLocation(savedLocation.id, changes);
                    }}
                    onCancel={closeDialog}
                />
            )}
        </div>
    );
}

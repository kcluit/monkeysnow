import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useDetailedWeatherData } from '../../hooks/useDetailedWeatherData';
import { useElevationFetch } from '../../hooks/useElevationFetch';
import { useBudgetPause } from '../../hooks/useBudgetPause';
import { FetchStatus } from '../FetchStatus';
import { DetailUtilityBar } from './DetailUtilityBar';
import { DetailChartGrid } from './DetailChartGrid';
import { SavedLocationDialog } from './SavedLocationDialog';
import { ResortMap } from '../map/ResortMap';
import { suggestedName, updateSavedLocation, type SavedLocationInput } from '../../utils/savedLocations';
import { MAX_SELECTED_RESORTS } from '../../hooks/useResortHierarchy';
import { DEFAULT_VARIABLES } from '../../utils/chartConfigurations';
import {
    aggregationOptions,
    RECOMMENDED_MODELS,
    coversPoint,
    inCatalogueOrder,
    isKnownModel,
} from '../../data/modelHierarchy';
import { resolveComparisonModels } from '../../utils/comparisonModels';
import type { DetailedResortViewProps, ElevationSelection, CustomLocation } from '../../types/detailView';
import type { WeatherModel, WeatherVariable, AggregationType } from '../../types/openMeteo';
import type { UnitSystem, ModelLineOpacity } from '../../types';
import { formatElevation } from '../../utils/unitConversion';

interface DetailedResortViewPropsWithUnits extends DetailedResortViewProps {
    unitSystem: UnitSystem;
    showUtilityBar: boolean;
    utilityBarStyle: import('../../types').UtilityBarStyle;
    modelLineOpacity: ModelLineOpacity;
    onBack: () => void;
    /** Keeps the Custom location being shown as a new Saved location */
    onSaveLocation: (input: SavedLocationInput) => void;
    /** Deletes this view's Saved location */
    onDeleteSavedLocation?: (id: string) => void;
    /** Set right after saving, when the Selection was already full */
    selectionWasFull?: boolean;
    onDismissSelectionWasFull?: () => void;
}

// Keys whose saved values were dropped by moving to a new key (docs/adr/0003, docs/adr/0005)
const RETIRED_STORAGE_KEYS = ['detailSelectedModels', 'detailPreferredModels', 'detailSelectedAggregations'];

// Default aggregation colors
const DEFAULT_AGGREGATION_COLORS: Record<AggregationType, string> = {
    median: aggregationOptions.find(a => a.id === 'median')?.defaultColor ?? '#a855f7',
    mean: aggregationOptions.find(a => a.id === 'mean')?.defaultColor ?? '#ec4899',
    min: aggregationOptions.find(a => a.id === 'min')?.defaultColor ?? '#14b8a6',
    max: aggregationOptions.find(a => a.id === 'max')?.defaultColor ?? '#f97316',
    p25: aggregationOptions.find(a => a.id === 'p25')?.defaultColor ?? '#3b82f6',
    p75: aggregationOptions.find(a => a.id === 'p75')?.defaultColor ?? '#10b981',
};

export function DetailedResortView({
    resortId: _resortId,
    resortName,
    location,
    savedLocation,
    unitSystem,
    showUtilityBar,
    utilityBarStyle,
    modelLineOpacity,
    onBack,
    onSaveLocation,
    onDeleteSavedLocation,
    selectionWasFull = false,
    onDismissSelectionWasFull,
}: DetailedResortViewPropsWithUnits): JSX.Element {
    // The visitor's Preferred models: one list for every Resort, starting as the Recommended models.
    // New keys wipe saved model lists and Aggregations once (docs/adr/0003, docs/adr/0005).
    const [preferredModels, setPreferredModels] = useLocalStorage<WeatherModel[]>(
        'detailPreferredModelsV2',
        RECOMMENDED_MODELS
    );
    useEffect(() => {
        try {
            for (const key of RETIRED_STORAGE_KEYS) localStorage.removeItem(key);
        } catch {
            // Storage unavailable; nothing to clean up
        }
    }, []);

    // State for selected variables - default selection
    const [selectedVariables, setSelectedVariables] = useLocalStorage<WeatherVariable[]>(
        'detailSelectedVariables',
        DEFAULT_VARIABLES
    );

    // State for selected aggregations - none by default, since two models have no useful median (docs/adr/0005)
    const [selectedAggregations, setSelectedAggregations] = useLocalStorage<AggregationType[]>(
        'detailSelectedAggregationsV2',
        []
    );

    // State for aggregation colors (user configurable)
    const [aggregationColors, setAggregationColors] = useLocalStorage<Record<AggregationType, string>>(
        'detailAggregationColors',
        DEFAULT_AGGREGATION_COLORS
    );

    // State for hiding aggregation members (individual model lines)
    const [hideAggregationMembers, setHideAggregationMembers] = useLocalStorage<boolean>(
        'detailHideAggregationMembers',
        false
    );

    // State for band fill visibility (disabled by default)
    const [showMinMaxFill, setShowMinMaxFill] = useLocalStorage<boolean>(
        'detailShowMinMaxFill',
        false
    );

    const [showPercentileFill, setShowPercentileFill] = useLocalStorage<boolean>(
        'detailShowPercentileFill',
        false
    );

    // State for elevation selection - can be 'base', 'mid', 'top', or a custom number
    // Default to 'base' so it dynamically uses each resort's base elevation
    const [elevationSelection, setElevationSelection] = useLocalStorage<ElevationSelection>(
        'detailElevationSelection',
        'base'
    );

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

    // State for forecast days - default to 14
    const [forecastDays, setForecastDays] = useLocalStorage<number>(
        'detailForecastDays',
        14
    );

    // State for chart lock - prevents scroll zoom and hides range slider
    const [isChartLocked, setIsChartLocked] = useLocalStorage<boolean>(
        'detailChartLocked',
        false
    );

    // Custom location state (temporary - NOT persisted unless saved as a Saved location)
    const [customLocation, setCustomLocation] = useState<CustomLocation | null>(null);
    const [isLoadingElevation, setIsLoadingElevation] = useState(false);
    // The 0 m fallback below is fine to forecast at for a moment, but never to save
    const [elevationLookupFailed, setElevationLookupFailed] = useState(false);

    // Elevation fetch hook
    const { fetchElevation } = useElevationFetch();

    // Handle map click - set custom location and fetch elevation
    const handleMapClick = useCallback(async (lat: number, lon: number) => {
        // Set custom location immediately with null elevation
        setCustomLocation({ lat, lon, elevation: null });
        setIsLoadingElevation(true);
        setElevationLookupFailed(false);

        try {
            const elevation = await fetchElevation(lat, lon);
            setCustomLocation({ lat, lon, elevation });
            setIsLoadingElevation(false);
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                // Request was cancelled (user clicked again), don't update state
                // The next click will manage loading state
                return;
            }
            console.error('Failed to fetch elevation:', error);
            // Fall back to 0m elevation on error
            setCustomLocation({ lat, lon, elevation: 0 });
            setIsLoadingElevation(false);
            setElevationLookupFailed(true);
        }
    }, [fetchElevation]);

    // Reset custom location to return to original resort
    const handleResetCustomLocation = useCallback(() => {
        setCustomLocation(null);
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

    // Compute effective elevation for weather data
    const effectiveElevation = useMemo(() => {
        if (customLocation?.elevation !== null && customLocation?.elevation !== undefined) {
            return customLocation.elevation;
        }
        // While loading custom elevation, use resolved resort elevation
        return resolvedElevation;
    }, [customLocation, resolvedElevation]);

    // Toggle variable visibility (for the eye icon on each chart)
    const toggleVariable = useCallback((variable: WeatherVariable) => {
        // Don't allow removing the last variable
        if (selectedVariables.length > 1) {
            setSelectedVariables(selectedVariables.filter((v) => v !== variable));
        }
    }, [selectedVariables, setSelectedVariables]);

    // Only fetch Preferred models whose Coverage includes the point being forecast
    const coveringModels = useMemo(
        () => inCatalogueOrder(
            preferredModels.filter((model) =>
                isKnownModel(model) && coversPoint(model, effectiveCoords.lat, effectiveCoords.lon)
            )
        ),
        [preferredModels, effectiveCoords.lat, effectiveCoords.lon]
    );

    // Fetch weather data using effective coordinates
    const { data, unavailableModels, timezoneInfo, loading, error, refetch } = useDetailedWeatherData({
        latitude: effectiveCoords.lat,
        longitude: effectiveCoords.lon,
        elevation: effectiveElevation,
        models: coveringModels,
        variables: selectedVariables,
        forecastDays,
        enabled: true,
    });

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

    // During a rate-limit pause, say how many models are still waiting instead of a bare spinner
    const pause = useBudgetPause();
    const pendingModels = Math.max(0, coveringModels.length - (data?.size ?? 0) - unavailableModels.size);

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
                    customElevation={customLocation?.elevation}
                    isLoadingElevation={isLoadingElevation}
                />
            </div>

            {/* Header */}
            <div className="mb-6 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-theme-textPrimary">
                        {customLocation ? 'Custom Location' : resortName}
                    </h1>
                    {customLocation && (
                        <>
                            <button
                                onClick={() => setDialog('save')}
                                className="px-3 py-1 text-sm rounded-lg bg-theme-secondary hover:bg-theme-cardBg transition-colors text-theme-accent"
                            >
                                Save location
                            </button>
                            <button
                                onClick={handleResetCustomLocation}
                                className="px-3 py-1 text-sm rounded-lg bg-theme-secondary hover:bg-theme-cardBg transition-colors text-theme-accent flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Reset to {resortName}</span>
                            </button>
                        </>
                    )}
                    {savedLocation && !customLocation && (confirmingDelete ? (
                        <div className="flex items-center gap-2 text-sm" role="alert">
                            <span className="text-theme-textSecondary">Delete {savedLocation.name}?</span>
                            <button
                                onClick={() => onDeleteSavedLocation?.(savedLocation.id)}
                                className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors text-red-500"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => setConfirmingDelete(false)}
                                className="px-3 py-1 rounded-lg bg-theme-secondary hover:bg-theme-cardBg transition-colors text-theme-textSecondary"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => setDialog('edit')}
                                className="px-3 py-1 text-sm rounded-lg bg-theme-secondary hover:bg-theme-cardBg transition-colors text-theme-accent"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => setConfirmingDelete(true)}
                                className="px-3 py-1 text-sm rounded-lg bg-theme-secondary hover:bg-theme-cardBg transition-colors text-red-500"
                            >
                                Delete
                            </button>
                        </>
                    ))}
                </div>
                {selectionWasFull && (
                    <div className="flex items-center gap-3 mt-2 text-sm text-theme-textSecondary" role="status">
                        <span>Saved, but not added to the main page: {MAX_SELECTED_RESORTS} resort maximum reached.</span>
                        <button
                            onClick={onDismissSelectionWasFull}
                            className="shrink-0 p-1 rounded-md hover:bg-theme-border transition-colors hover:text-theme-textPrimary"
                            aria-label="Dismiss notice"
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
                            <span>Lat: {customLocation.lat.toFixed(4)}</span>
                            <span>Lon: {customLocation.lon.toFixed(4)}</span>
                            {isLoadingElevation || customLocation.elevation === null ? (
                                <span className="animate-pulse">Fetching elevation...</span>
                            ) : (
                                <span>Elevation: {formatElevation(customLocation.elevation, unitSystem)}</span>
                            )}
                        </>
                    ) : savedLocation ? (
                        <>
                            <span>Lat: {savedLocation.lat.toFixed(4)}</span>
                            <span>Lon: {savedLocation.lon.toFixed(4)}</span>
                            <span>Elevation: {formatElevation(savedLocation.elevation, unitSystem)}</span>
                        </>
                    ) : (
                        <>
                            <span>Lat: {location.lat.toFixed(4)}</span>
                            <span>Lon: {location.lon.toFixed(4)}</span>
                            <span>Base: {formatElevation(location.baseElevation, unitSystem)}</span>
                            <span>Mid: {formatElevation(location.midElevation, unitSystem)}</span>
                            <span>Top: {formatElevation(location.topElevation, unitSystem)}</span>
                        </>
                    )}
                    {timezoneInfo && (
                        <span>Timezone: {timezoneInfo.timezoneAbbreviation} ({timezoneInfo.timezone})</span>
                    )}
                </div>
            </div>

            {/* Utility Bar */}
            {showUtilityBar && (
                <div className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
                    <DetailUtilityBar
                        onBack={onBack}
                        unitSystem={unitSystem}
                        selectedModels={preferredModels}
                        setSelectedModels={setPreferredModels}
                        selectedVariables={selectedVariables}
                        setSelectedVariables={setSelectedVariables}
                        selectedAggregations={selectedAggregations}
                        setSelectedAggregations={setSelectedAggregations}
                        aggregationColors={aggregationColors}
                        setAggregationColors={setAggregationColors}
                        hideAggregationMembers={hideAggregationMembers}
                        setHideAggregationMembers={setHideAggregationMembers}
                        showMinMaxFill={showMinMaxFill}
                        setShowMinMaxFill={setShowMinMaxFill}
                        showPercentileFill={showPercentileFill}
                        setShowPercentileFill={setShowPercentileFill}
                        elevationSelection={elevationSelection}
                        setElevationSelection={setElevationSelection}
                        resolvedElevation={resolvedElevation}
                        forecastDays={forecastDays}
                        setForecastDays={setForecastDays}
                        location={location}
                        isChartLocked={isChartLocked}
                        setIsChartLocked={setIsChartLocked}
                        fixedElevation={savedLocation?.elevation}
                        customLocation={customLocation}
                        onResetCustomLocation={handleResetCustomLocation}
                        isLoadingElevation={isLoadingElevation}
                        utilityBarStyle={utilityBarStyle}
                        modelAvailability={modelAvailability}
                    />
                </div>
            )}

            {/* Loading State - Only show when no data at all */}
            {loading && !data && (
                <div className="text-center py-12">
                    <div className="text-xl font-semibold text-theme-textSecondary">
                        Loading forecast data...
                    </div>
                    <div className="text-sm text-theme-textSecondary mt-2">
                        Fetching from {coveringModels.length} weather model(s)
                    </div>
                </div>
            )}

            {/* Error State - Only show if no data and not loading (completed with error) */}
            {error && !loading && !data && (
                <div className="text-center py-12">
                    <div className="text-xl font-semibold text-red-600">
                        Error loading forecast data
                    </div>
                    <div className="text-sm text-theme-textSecondary mt-2">
                        {error.message}
                    </div>
                    <button
                        onClick={refetch}
                        className="mt-4 px-4 py-2 rounded-lg bg-theme-accent text-white hover:opacity-90 transition-opacity"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Charts */}
            {data && (
                <>
                    <DetailChartGrid
                        data={data}
                        selectedModels={comparisonModels}
                        selectedVariables={selectedVariables}
                        selectedAggregations={selectedAggregations}
                        aggregationColors={aggregationColors}
                        hideAggregationMembers={hideAggregationMembers}
                        showMinMaxFill={showMinMaxFill}
                        showPercentileFill={showPercentileFill}
                        modelLineOpacity={modelLineOpacity}
                        unitSystem={unitSystem}
                        timezoneInfo={timezoneInfo ?? undefined}
                        isChartLocked={isChartLocked}
                        isLoading={loading}
                        onToggleVariable={toggleVariable}
                        location={location}
                    />
                    {loading && (pause ? (
                        <FetchStatus
                            count={pendingModels}
                            calls={pendingModels}
                            things="models"
                            onlyWhenLimited
                            className="text-center py-2 text-sm text-theme-textSecondary"
                        />
                    ) : (
                        <div className="text-center py-2 text-sm text-theme-textSecondary animate-pulse">
                            Loading additional model data...
                        </div>
                    ))}
                </>
            )}

            {/* No data state */}
            {!loading && !error && !data && (
                <div className="text-center py-12">
                    <div className="text-theme-textSecondary text-lg">
                        Select models and variables to view forecast
                    </div>
                </div>
            )}

            {dialog === 'save' && customLocation && (
                <SavedLocationDialog
                    title="Save location"
                    submitLabel="Save"
                    initialName={suggestedName(customLocation.lat, customLocation.lon)}
                    initialElevation={elevationLookupFailed ? null : customLocation.elevation}
                    isLoadingElevation={isLoadingElevation}
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
                    title="Edit location"
                    submitLabel="Save"
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

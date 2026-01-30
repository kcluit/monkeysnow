import { useCallback, useMemo, useState } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useDetailedWeatherData } from '../../hooks/useDetailedWeatherData';
import { useElevationFetch } from '../../hooks/useElevationFetch';
import { DetailUtilityBar } from './DetailUtilityBar';
import { DetailChartGrid } from './DetailChartGrid';
import { ResortMap } from '../map/ResortMap';
import { DEFAULT_VARIABLES, DEFAULT_MODELS } from '../../utils/chartConfigurations';
import { aggregationOptions } from '../../data/modelHierarchy';
import type { DetailedResortViewProps, ElevationSelection, CustomLocation } from '../../types/detailView';
import type { WeatherModel, WeatherVariable, AggregationType } from '../../types/openMeteo';
import type { UnitSystem } from '../../types';

interface DetailedResortViewPropsWithUnits extends DetailedResortViewProps {
    unitSystem: UnitSystem;
    showUtilityBar: boolean;
}

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
    unitSystem,
    showUtilityBar,
}: DetailedResortViewPropsWithUnits): JSX.Element {
    // State for selected models
    const [selectedModels, setSelectedModels] = useLocalStorage<WeatherModel[]>(
        'detailSelectedModels',
        DEFAULT_MODELS
    );

    // State for selected variables - default selection
    const [selectedVariables, setSelectedVariables] = useLocalStorage<WeatherVariable[]>(
        'detailSelectedVariables',
        DEFAULT_VARIABLES
    );

    // State for selected aggregations (median, mean)
    const [selectedAggregations, setSelectedAggregations] = useLocalStorage<AggregationType[]>(
        'detailSelectedAggregations',
        ['median', 'mean']
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
    // Default to 'mid' so it dynamically uses each resort's mid elevation
    const [elevationSelection, setElevationSelection] = useLocalStorage<ElevationSelection>(
        'detailElevationSelection',
        'mid'
    );

    // Resolve the elevation selection to an actual number based on current resort
    const resolvedElevation = useMemo(() => {
        if (typeof elevationSelection === 'number') {
            return elevationSelection;
        }
        switch (elevationSelection) {
            case 'base': return location.baseElevation;
            case 'mid': return location.midElevation;
            case 'top': return location.topElevation;
            default: return location.midElevation;
        }
    }, [elevationSelection, location.baseElevation, location.midElevation, location.topElevation]);

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

    // Custom location state (temporary - NOT persisted to localStorage)
    const [customLocation, setCustomLocation] = useState<CustomLocation | null>(null);
    const [isLoadingElevation, setIsLoadingElevation] = useState(false);

    // Elevation fetch hook
    const { fetchElevation } = useElevationFetch();

    // Handle map click - set custom location and fetch elevation
    const handleMapClick = useCallback(async (lat: number, lon: number) => {
        // Set custom location immediately with null elevation
        setCustomLocation({ lat, lon, elevation: null });
        setIsLoadingElevation(true);

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
        }
    }, [fetchElevation]);

    // Reset custom location to return to original resort
    const handleResetCustomLocation = useCallback(() => {
        setCustomLocation(null);
    }, []);

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

    // Fetch weather data using effective coordinates
    const { data, timezoneInfo, loading, error, refetch } = useDetailedWeatherData({
        latitude: effectiveCoords.lat,
        longitude: effectiveCoords.lon,
        elevation: effectiveElevation,
        models: selectedModels,
        variables: selectedVariables,
        forecastDays,
        enabled: true,
    });

    return (
        <div>
            {/* Resort Map */}
            <div className="mb-6 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
                <ResortMap
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
                        <button
                            onClick={handleResetCustomLocation}
                            className="px-3 py-1 text-sm rounded-lg bg-theme-secondary hover:bg-theme-cardBg transition-colors text-theme-accent flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Reset to {resortName}</span>
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-4 text-sm text-theme-textSecondary flex-wrap">
                    {customLocation ? (
                        <>
                            <span>Lat: {customLocation.lat.toFixed(4)}</span>
                            <span>Lon: {customLocation.lon.toFixed(4)}</span>
                            {isLoadingElevation || customLocation.elevation === null ? (
                                <span className="animate-pulse">Fetching elevation...</span>
                            ) : (
                                <span>Elevation: {customLocation.elevation}m</span>
                            )}
                        </>
                    ) : (
                        <>
                            <span>Lat: {location.lat.toFixed(4)}</span>
                            <span>Lon: {location.lon.toFixed(4)}</span>
                            <span>Base: {location.baseElevation}m</span>
                            <span>Mid: {location.midElevation}m</span>
                            <span>Top: {location.topElevation}m</span>
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
                        selectedModels={selectedModels}
                        setSelectedModels={setSelectedModels}
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
                        customLocation={customLocation}
                        onResetCustomLocation={handleResetCustomLocation}
                        isLoadingElevation={isLoadingElevation}
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
                        Fetching from {selectedModels.length} weather model(s)
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
                        selectedModels={selectedModels}
                        selectedVariables={selectedVariables}
                        selectedAggregations={selectedAggregations}
                        aggregationColors={aggregationColors}
                        hideAggregationMembers={hideAggregationMembers}
                        showMinMaxFill={showMinMaxFill}
                        showPercentileFill={showPercentileFill}
                        unitSystem={unitSystem}
                        timezoneInfo={timezoneInfo ?? undefined}
                        isChartLocked={isChartLocked}
                        onToggleVariable={toggleVariable}
                        location={location}
                    />
                    {loading && (
                        <div className="text-center py-2 text-sm text-theme-textSecondary animate-pulse">
                            Loading additional model data...
                        </div>
                    )}
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
        </div>
    );
}

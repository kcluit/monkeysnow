import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useDetailedWeatherData } from '../../hooks/useDetailedWeatherData';
import { DetailUtilityBar } from './DetailUtilityBar';
import { DetailChartGrid } from './DetailChartGrid';
import { DEFAULT_VARIABLES, DEFAULT_MODELS } from '../../utils/chartConfigurations';
import type { DetailedResortViewProps } from '../../types/detailView';
import type { WeatherModel, WeatherVariable } from '../../types/openMeteo';
import type { UnitSystem } from '../../types';

interface DetailedResortViewPropsWithUnits extends DetailedResortViewProps {
    unitSystem: UnitSystem;
}

export function DetailedResortView({
    resortId: _resortId,
    resortName,
    location,
    onBack,
    unitSystem,
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

    // State for elevation - default to mid elevation
    const [elevation, setElevation] = useLocalStorage<number>(
        'detailElevation',
        location.midElevation
    );

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

    // Fetch weather data
    const { data, timezoneInfo, loading, error, refetch } = useDetailedWeatherData({
        latitude: location.lat,
        longitude: location.lon,
        elevation,
        models: selectedModels,
        variables: selectedVariables,
        forecastDays,
        enabled: true,
    });

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-theme-textPrimary">{resortName}</h1>
                <div className="flex items-center gap-4 text-sm text-theme-textSecondary flex-wrap">
                    <span>Lat: {location.lat.toFixed(4)}</span>
                    <span>Lon: {location.lon.toFixed(4)}</span>
                    <span>Base: {location.baseElevation}m</span>
                    <span>Mid: {location.midElevation}m</span>
                    <span>Top: {location.topElevation}m</span>
                    {timezoneInfo && (
                        <span>Timezone: {timezoneInfo.timezoneAbbreviation} ({timezoneInfo.timezone})</span>
                    )}
                </div>
            </div>

            {/* Utility Bar */}
            <DetailUtilityBar
                selectedModels={selectedModels}
                setSelectedModels={setSelectedModels}
                selectedVariables={selectedVariables}
                setSelectedVariables={setSelectedVariables}
                elevation={elevation}
                setElevation={setElevation}
                forecastDays={forecastDays}
                setForecastDays={setForecastDays}
                location={location}
                onBack={onBack}
                isChartLocked={isChartLocked}
                setIsChartLocked={setIsChartLocked}
            />

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
                        unitSystem={unitSystem}
                        timezoneInfo={timezoneInfo ?? undefined}
                        isChartLocked={isChartLocked}
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

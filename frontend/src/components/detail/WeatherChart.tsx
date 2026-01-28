/**
 * Weather Chart Component
 *
 * Displays a single weather variable chart with all selected models.
 * Includes settings modal for chart type and overlay options.
 */

import { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useChartTheme } from '../../hooks/useChartTheme';
import { UPlotChart } from '../../lib/charts';
import { setChartZoomSyncExclusion } from '../../lib/charts/chartRegistry';
import { buildWeatherChartConfig } from '../../utils/chartBuilder';
import { ChartSettingsModal } from './ChartSettingsModal';
import { getVariableConfig, hasOverlays, getOverlayConfig } from '../../utils/chartConfigurations';
import type { WeatherChartProps } from '../../types/detailView';
import type { ChartDisplayType } from '../../types/chartSettings';

interface WeatherChartComponentProps extends WeatherChartProps {
}

export function WeatherChart({
    data,
    selectedModels,
    selectedAggregations,
    aggregationColors,
    hideAggregationMembers,
    showMinMaxFill,
    showPercentileFill,
    variable,
    unitSystem,
    timezoneInfo,
    isChartLocked,
    onToggleVisibility,
    location,
}: WeatherChartComponentProps): JSX.Element {
    const variableConfig = getVariableConfig(variable);

    // Chart settings from localStorage
    const [chartType, setChartType] = useLocalStorage<ChartDisplayType>(
        `chartType_${variable}`,
        variableConfig.chartType as ChartDisplayType
    );
    const [showAccumulation, setShowAccumulation] = useLocalStorage<boolean>(
        `chartAccumulation_${variable}`,
        false
    );
    // Multi-level overlay setting (enabled by default for variables that support it)
    const [showOverlays, setShowOverlays] = useLocalStorage<boolean>(
        `chartOverlays_${variable}`,
        hasOverlays(variable) // Default to true for variables with overlays
    );
    const [zoomSyncExcluded, setZoomSyncExcluded] = useLocalStorage<boolean>(
        `chartZoomSyncExcluded_${variable}`,
        false
    );

    // Chart dimension settings (default height varies by variable, user can adjust via settings)
    const [chartHeight, setChartHeight] = useLocalStorage<number>(
        `chartHeight_${variable}`,
        variableConfig.defaultHeight ?? 380
    );
    const [chartWidth, setChartWidth] = useLocalStorage<number>(
        `chartWidth_${variable}`,
        100 // percentage
    );

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Sync zoom exclusion setting to registry
    useEffect(() => {
        setChartZoomSyncExclusion(variable, zoomSyncExcluded);
    }, [variable, zoomSyncExcluded]);

    // Settings modal state
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Get theme
    const theme = useChartTheme();

    // Build chart config (memoized for performance)
    const chartConfig = useMemo(() => {
        return buildWeatherChartConfig(
            {
                data,
                selectedModels,
                selectedAggregations,
                aggregationColors,
                hideAggregationMembers,
                showMinMaxFill,
                showPercentileFill,
                variable,
                unitSystem,
                timezoneInfo,
                isChartLocked,
                location,
            },
            theme,
            {
                chartTypeOverride: chartType,
                showAccumulation,
                showOverlays,
                customHeight: chartHeight,
            }
        );
    }, [
        data,
        selectedModels,
        selectedAggregations,
        aggregationColors,
        hideAggregationMembers,
        showMinMaxFill,
        showPercentileFill,
        variable,
        unitSystem,
        timezoneInfo,
        isChartLocked,
        location,
        theme,
        chartType,
        showAccumulation,
        showOverlays,
        chartHeight,
    ]);

    // Handle no data
    if (!chartConfig) {
        return (
            <div className="weather-chart weather-chart-empty">
                <div className="weather-chart-header">
                    <div className="weather-chart-title">
                        <span
                            className="weather-chart-color-indicator"
                            style={{ backgroundColor: variableConfig.color }}
                        />
                        <span>
                            {variableConfig.label}
                            {(unitSystem === 'metric' ? variableConfig.unit : variableConfig.unitImperial) && (
                                <span className="weather-chart-unit">
                                    {' '}({unitSystem === 'metric' ? variableConfig.unit : variableConfig.unitImperial})
                                </span>
                            )}
                        </span>
                        {variableConfig.description && (
                            <span className="weather-chart-description">
                                {variableConfig.description}
                            </span>
                        )}
                    </div>
                </div>
                <div className="weather-chart-no-data">
                    <p>No data available</p>
                </div>
            </div>
        );
    }

    // Compute container styles for fullscreen mode
    const containerStyle: React.CSSProperties = isFullscreen
        ? { width: `${chartWidth}%` }
        : {};

    return (
        <div
            className={`weather-chart${isFullscreen ? ' weather-chart-fullscreen' : ''}`}
            style={containerStyle}
        >
            {/* Header */}
            <div className="weather-chart-header">
                <div className="weather-chart-title">
                    <span
                        className="weather-chart-color-indicator"
                        style={{ backgroundColor: variableConfig.color }}
                    />
                    <span>
                        {variableConfig.label}
                        {(unitSystem === 'metric' ? variableConfig.unit : variableConfig.unitImperial) && (
                            <span className="weather-chart-unit">
                                {' '}({unitSystem === 'metric' ? variableConfig.unit : variableConfig.unitImperial})
                            </span>
                        )}
                    </span>
                    {variableConfig.description && (
                        <span className="weather-chart-description">
                            {variableConfig.description}
                        </span>
                    )}
                </div>
                <div className="weather-chart-actions">
                    {/* Fullscreen toggle button */}
                    <button
                        type="button"
                        className="weather-chart-btn"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            {isFullscreen ? (
                                // Minimize icon (exit fullscreen)
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                                />
                            ) : (
                                // Maximize icon (enter fullscreen)
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                                />
                            )}
                        </svg>
                    </button>
                    <button
                        type="button"
                        className="weather-chart-btn"
                        onClick={() => setIsSettingsOpen(true)}
                        title="Chart settings"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                    </button>
                    {onToggleVisibility && (
                        <button
                            type="button"
                            className="weather-chart-btn"
                            onClick={onToggleVisibility}
                            title="Hide chart"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Chart */}
            <UPlotChart
                config={chartConfig}
                className="weather-chart-canvas"
                chartKey={variable}
            />

            {/* Settings Modal */}
            <ChartSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                variable={variable}
                chartType={chartType}
                onChartTypeChange={setChartType}
                showAccumulation={showAccumulation}
                onAccumulationChange={setShowAccumulation}
                showOverlays={showOverlays}
                onOverlaysChange={setShowOverlays}
                zoomSyncExcluded={zoomSyncExcluded}
                onZoomSyncExcludedChange={setZoomSyncExcluded}
                chartHeight={chartHeight}
                onChartHeightChange={setChartHeight}
                chartWidth={chartWidth}
                onChartWidthChange={setChartWidth}
            />
        </div>
    );
}

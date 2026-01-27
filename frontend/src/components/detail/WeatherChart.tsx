/**
 * Weather Chart Component
 *
 * Displays a single weather variable chart with all selected models.
 * Includes settings modal for chart type and overlay options.
 */

import { useState, useMemo } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useChartTheme } from '../../hooks/useChartTheme';
import { UPlotChart } from '../../lib/charts';
import { buildWeatherChartConfig } from '../../utils/chartBuilder';
import { ChartSettingsModal } from './ChartSettingsModal';
import { getVariableConfig } from '../../utils/chartConfigurations';
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
    variable,
    unitSystem,
    timezoneInfo,
    isChartLocked,
    onToggleVisibility,
    location,
    currentElevation,
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
                variable,
                unitSystem,
                timezoneInfo,
                isChartLocked,
            },
            theme,
            {
                chartTypeOverride: chartType,
                showAccumulation,
            }
        );
    }, [
        data,
        selectedModels,
        selectedAggregations,
        aggregationColors,
        hideAggregationMembers,
        variable,
        unitSystem,
        timezoneInfo,
        isChartLocked,
        theme,
        chartType,
        showAccumulation,
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
                        <span>{variableConfig.label}</span>
                    </div>
                </div>
                <div className="weather-chart-no-data">
                    <p>No data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="weather-chart">
            {/* Header */}
            <div className="weather-chart-header">
                <div className="weather-chart-title">
                    <span
                        className="weather-chart-color-indicator"
                        style={{ backgroundColor: variableConfig.color }}
                    />
                    <span>{variableConfig.label}</span>
                </div>
                <div className="weather-chart-actions">
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
                showElevationLines={showElevationLines}
                onElevationLinesChange={setShowElevationLines}
                location={location}
                currentElevation={currentElevation}
            />
        </div>
    );
}

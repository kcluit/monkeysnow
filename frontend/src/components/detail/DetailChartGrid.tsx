/**
 * Detail Chart Grid Component
 *
 * Renders a grid of weather charts for selected variables.
 * Coordinates zoom/pan synchronization across all charts.
 */

import { useMemo } from 'react';
import { WeatherChart } from './WeatherChart';
import type { DetailChartGridProps } from '../../types/detailView';

export function DetailChartGrid({
    data,
    selectedModels,
    selectedVariables,
    selectedAggregations,
    aggregationColors,
    hideAggregationMembers,
    unitSystem,
    timezoneInfo,
    isChartLocked,
    onToggleVariable,
    location,
    currentElevation,
}: DetailChartGridProps): JSX.Element {
    // Generate a stable sync key for coordinating zoom/pan across charts
    // Using a constant key ensures all charts stay in sync within this grid
    const syncKey = useMemo(() => 'detail-chart-grid-sync', []);

    return (
        <div className="detail-chart-grid">
            {selectedVariables.map((variable) => (
                <WeatherChart
                    key={variable}
                    data={data}
                    selectedModels={selectedModels}
                    selectedAggregations={selectedAggregations}
                    aggregationColors={aggregationColors}
                    hideAggregationMembers={hideAggregationMembers}
                    variable={variable}
                    unitSystem={unitSystem}
                    timezoneInfo={timezoneInfo}
                    isChartLocked={isChartLocked}
                    onToggleVisibility={
                        onToggleVariable ? () => onToggleVariable(variable) : undefined
                    }
                    location={location}
                    currentElevation={currentElevation}
                    syncKey={syncKey}
                />
            ))}
        </div>
    );
}

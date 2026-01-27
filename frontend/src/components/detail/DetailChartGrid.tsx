/**
 * Detail Chart Grid Component
 *
 * Renders a grid of weather charts for selected variables.
 * Coordinates zoom/pan synchronization across all charts.
 */

import { WeatherChart } from './WeatherChart';
import type { DetailChartGridProps } from '../../types/detailView';

/** Sync key for coordinating zoom/pan across charts in this grid */
const CHART_SYNC_KEY = 'detail-chart-grid-sync';

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
                    syncKey={CHART_SYNC_KEY}
                />
            ))}
        </div>
    );
}

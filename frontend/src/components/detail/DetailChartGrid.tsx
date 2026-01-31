/**
 * Detail Chart Grid Component
 *
 * Renders a grid of weather charts for selected variables.
 */

import { WeatherChart } from './WeatherChart';
import type { DetailChartGridProps } from '../../types/detailView';



export function DetailChartGrid({
    data,
    selectedModels,
    selectedVariables,
    selectedAggregations,
    aggregationColors,
    hideAggregationMembers,
    showMinMaxFill,
    showPercentileFill,
    unitSystem,
    timezoneInfo,
    isChartLocked,
    onToggleVariable,
    location,
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
                    showMinMaxFill={showMinMaxFill}
                    showPercentileFill={showPercentileFill}
                    variable={variable}
                    unitSystem={unitSystem}
                    timezoneInfo={timezoneInfo}
                    isChartLocked={isChartLocked}
                    onToggleVisibility={
                        onToggleVariable ? () => onToggleVariable(variable) : undefined
                    }
                    location={location}
                />
            ))}
        </div>
    );
}

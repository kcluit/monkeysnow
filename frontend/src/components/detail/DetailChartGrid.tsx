
import { WeatherChart } from './WeatherChart';
import type { DetailChartGridProps } from '../../types/detailView';
import type { WeatherVariable } from '../../types/openMeteo';

interface ChartCardProps {
    data: DetailChartGridProps['data'];
    selectedModels: DetailChartGridProps['selectedModels'];
    selectedAggregations: DetailChartGridProps['selectedAggregations'];
    aggregationColors: DetailChartGridProps['aggregationColors'];
    hideAggregationMembers?: DetailChartGridProps['hideAggregationMembers'];
    variable: WeatherVariable;
    unitSystem: DetailChartGridProps['unitSystem'];
    timezoneInfo: DetailChartGridProps['timezoneInfo'];
    isChartLocked: DetailChartGridProps['isChartLocked'];
    onToggleVariable?: (variable: WeatherVariable) => void;
    location?: DetailChartGridProps['location'];
    currentElevation?: DetailChartGridProps['currentElevation'];
}

/**
 * Individual chart card
 */
function ChartCard({
    data,
    selectedModels,
    selectedAggregations,
    aggregationColors,
    hideAggregationMembers,
    variable,
    unitSystem,
    timezoneInfo,
    isChartLocked,
    onToggleVariable,
    location,
    currentElevation,
}: ChartCardProps) {
    return (
        <WeatherChart
            data={data}
            selectedModels={selectedModels}
            selectedAggregations={selectedAggregations}
            aggregationColors={aggregationColors}
            hideAggregationMembers={hideAggregationMembers}
            variable={variable}
            unitSystem={unitSystem}
            timezoneInfo={timezoneInfo}
            isChartLocked={isChartLocked}
            onToggleVisibility={onToggleVariable ? () => onToggleVariable(variable) : undefined}
            location={location}
            currentElevation={currentElevation}
        />
    );
}

function DetailChartGrid({
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
    if (!data || data.size === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-theme-textSecondary text-lg">No data available</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {selectedVariables.map((variable) => (
                <div
                    key={variable}
                    className="resort-card rounded-none py-4 border-x-0"
                >
                    <ChartCard
                        data={data}
                        selectedModels={selectedModels}
                        selectedAggregations={selectedAggregations}
                        aggregationColors={aggregationColors}
                        hideAggregationMembers={hideAggregationMembers}
                        variable={variable}
                        unitSystem={unitSystem}
                        timezoneInfo={timezoneInfo}
                        isChartLocked={isChartLocked}
                        onToggleVariable={onToggleVariable}
                        location={location}
                        currentElevation={currentElevation}
                    />
                </div>
            ))}
        </div>
    );
}

// Export component
export { DetailChartGrid };

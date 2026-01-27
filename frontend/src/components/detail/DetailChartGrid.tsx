import { memo, useMemo } from 'react';
import { WeatherChart } from './WeatherChart';
import { VirtualizedChart } from './VirtualizedChart';
import type { DetailChartGridProps } from '../../types/detailView';
import type { WeatherVariable } from '../../types/openMeteo';

/** Threshold for enabling virtualization - only virtualize when many charts */
const VIRTUALIZATION_THRESHOLD = 5;

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
    useVirtualization: boolean;
}

/**
 * Individual chart card - either virtualized or direct render
 */
const ChartCard = memo(function ChartCard({
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
    useVirtualization,
}: ChartCardProps) {
    const chartElement = (
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

    if (useVirtualization) {
        return (
            <VirtualizedChart chartId={`chart-${variable}`}>
                {chartElement}
            </VirtualizedChart>
        );
    }

    return chartElement;
});

function DetailChartGridInner({
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
    // Enable virtualization when we have many charts
    const useVirtualization = selectedVariables.length >= VIRTUALIZATION_THRESHOLD;

    // Memoize the chart cards to prevent unnecessary re-renders
    const chartCards = useMemo(() => {
        if (!data || data.size === 0) {
            return null;
        }

        return selectedVariables.map((variable) => (
            <div
                key={variable}
                className="resort-card rounded-none py-4 shadow-top-bottom"
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
                    useVirtualization={useVirtualization}
                />
            </div>
        ));
    }, [
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
        useVirtualization,
    ]);

    if (!data || data.size === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-theme-textSecondary text-lg">No data available</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {chartCards}
        </div>
    );
}

// Export memoized component
export const DetailChartGrid = memo(DetailChartGridInner);

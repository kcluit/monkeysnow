import { memo, useMemo } from 'react';
import { WeatherChart } from './WeatherChart';
import type { DetailChartGridProps } from '../../types/detailView';

function DetailChartGridInner({
  data,
  selectedModels,
  selectedVariables,
  selectedAggregations,
  aggregationColors,
  unitSystem,
  timezoneInfo,
  isChartLocked,
}: DetailChartGridProps): JSX.Element {
  // Memoize the chart cards to prevent unnecessary re-renders
  const chartCards = useMemo(() => {
    if (!data || data.size === 0) {
      return null;
    }

    return selectedVariables.map((variable) => (
      <div
        key={variable}
        className="resort-card rounded-2xl p-4 shadow-lg backdrop-blur-md"
      >
        <WeatherChart
          data={data}
          selectedModels={selectedModels}
          selectedAggregations={selectedAggregations}
          aggregationColors={aggregationColors}
          variable={variable}
          unitSystem={unitSystem}
          timezoneInfo={timezoneInfo}
          isChartLocked={isChartLocked}
        />
      </div>
    ));
  }, [data, selectedModels, selectedVariables, selectedAggregations, aggregationColors, unitSystem, timezoneInfo, isChartLocked]);

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

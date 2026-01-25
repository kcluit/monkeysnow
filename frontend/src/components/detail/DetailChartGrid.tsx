import { WeatherChart } from './WeatherChart';
import type { DetailChartGridProps } from '../../types/detailView';

export function DetailChartGrid({
  data,
  selectedModels,
  selectedVariables,
  unitSystem,
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
      {selectedVariables.map((variable) => {
        return (
          <div
            key={variable}
            className="resort-card rounded-2xl p-4 shadow-lg backdrop-blur-md"
          >
            <WeatherChart
              data={data}
              selectedModels={selectedModels}
              variable={variable}
              unitSystem={unitSystem}
            />
          </div>
        );
      })}
    </div>
  );
}

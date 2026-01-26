/**
 * Weather Chart Component
 *
 * Displays a single weather variable chart for the detail view.
 * Uses the chart abstraction layer with ECharts for rendering.
 */

import { useMemo, memo } from 'react';
import { ChartRenderer } from '../../lib/charts';
import type { WeatherChartProps } from '../../types/detailView';
import { useChartTheme } from '../../hooks/useChartTheme';
import { buildWeatherChartConfig, getVariableDisplayInfo } from '../../utils/chartBuilder';

/**
 * Weather chart component.
 * Displays forecast data for a single variable across selected models.
 */
function WeatherChartInner({
  data,
  selectedModels,
  selectedAggregations,
  aggregationColors,
  variable,
  unitSystem,
  timezoneInfo,
  isChartLocked,
}: WeatherChartProps): JSX.Element {
  // Get reactive theme
  const theme = useChartTheme();

  // Get variable display info (label, unit, color)
  const displayInfo = useMemo(
    () => getVariableDisplayInfo(variable, unitSystem),
    [variable, unitSystem]
  );

  // Build chart configuration
  const chartConfig = useMemo(
    () =>
      buildWeatherChartConfig(
        {
          data,
          selectedModels,
          selectedAggregations,
          aggregationColors,
          variable,
          unitSystem,
          timezoneInfo,
          isChartLocked,
        },
        theme
      ),
    [data, selectedModels, selectedAggregations, aggregationColors, variable, unitSystem, timezoneInfo, theme, isChartLocked]
  );

  // Handle no data
  if (!chartConfig) {
    return (
      <div className="h-64 flex items-center justify-center text-theme-textSecondary">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Chart header with variable info */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: displayInfo.color }}
        />
        <h3 className="text-lg font-semibold text-theme-textPrimary">
          {displayInfo.label}
        </h3>
        <span className="text-sm text-theme-textSecondary">
          ({displayInfo.unit})
        </span>
      </div>

      {/* Chart */}
      <ChartRenderer config={chartConfig} />
    </div>
  );
}

/**
 * Memoized weather chart to prevent unnecessary re-renders.
 */
export const WeatherChart = memo(WeatherChartInner);

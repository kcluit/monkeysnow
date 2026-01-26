/**
 * Weather Chart Component
 *
 * Displays a single weather variable chart for the detail view.
 * Uses the chart abstraction layer with ECharts for rendering.
 * Includes visibility toggle and settings controls.
 */

import { useMemo, memo, useState } from 'react';
import { ChartRenderer } from '../../lib/charts';
import type { WeatherChartProps } from '../../types/detailView';
import type { ChartDisplayType } from '../../types/chartSettings';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useChartHoverCoordinator } from '../../hooks/useChartHoverCoordinator';
import { buildWeatherChartConfig, getVariableDisplayInfo } from '../../utils/chartBuilder';
import { getVariableConfig } from '../../utils/chartConfigurations';
import { ChartSettingsModal } from './ChartSettingsModal';
import { supportsAccumulation, supportsElevationLines } from '../../types/chartSettings';

/** Eye icon for visible state */
function EyeIcon(): JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

/** Gear/cog icon for settings */
function CogIcon(): JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

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
  onToggleVisibility,
  location,
  currentElevation,
}: WeatherChartProps): JSX.Element {
  // Get reactive theme
  const theme = useChartTheme();

  // Performance: Use hover coordinator to only process events on hovered chart
  const { containerRef } = useChartHoverCoordinator(`chart-${variable}`);

  // Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Per-variable settings from localStorage
  const defaultChartType = getVariableConfig(variable).chartType as ChartDisplayType;
  const [chartTypeOverride, setChartTypeOverride] = useLocalStorage<ChartDisplayType | null>(
    `chartType_${variable}`,
    null
  );
  const [showAccumulation, setShowAccumulation] = useLocalStorage<boolean>(
    `accumulation_${variable}`,
    false
  );
  const [showElevationLines, setShowElevationLines] = useLocalStorage<boolean>(
    `elevationLines_${variable}`,
    false
  );

  // Effective chart type (override or default)
  const effectiveChartType = chartTypeOverride ?? defaultChartType;

  // Get variable display info (label, unit, color)
  const displayInfo = useMemo(
    () => getVariableDisplayInfo(variable, unitSystem),
    [variable, unitSystem]
  );

  // Build chart configuration with settings
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
        theme,
        {
          chartTypeOverride: effectiveChartType,
          showAccumulation: supportsAccumulation(variable) ? showAccumulation : false,
          showElevationLines: supportsElevationLines(variable) ? showElevationLines : false,
          location,
          currentElevation,
        }
      ),
    [
      data,
      selectedModels,
      selectedAggregations,
      aggregationColors,
      variable,
      unitSystem,
      timezoneInfo,
      theme,
      isChartLocked,
      effectiveChartType,
      showAccumulation,
      showElevationLines,
      location,
      currentElevation,
    ]
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
      {/* Chart header with variable info and controls */}
      <div className="flex items-center justify-between mb-2">
        {/* Left side: color dot, label, unit */}
        <div className="flex items-center gap-2">
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

        {/* Right side: control buttons */}
        <div className="chart-controls">
          {onToggleVisibility && (
            <button
              type="button"
              className="chart-control-btn"
              onClick={onToggleVisibility}
              title="Hide this chart"
            >
              <EyeIcon />
            </button>
          )}
          <button
            type="button"
            className="chart-control-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Chart settings"
          >
            <CogIcon />
          </button>
        </div>
      </div>

      {/* Chart - wrapped in hover coordinator container for performance */}
      <div
        ref={containerRef}
        style={{
          // Performance: CSS containment to isolate repaints
          contain: 'layout style paint',
        }}
      >
        <ChartRenderer config={chartConfig} />
      </div>

      {/* Settings Modal */}
      <ChartSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        variable={variable}
        chartType={effectiveChartType}
        onChartTypeChange={(type) => {
          // Store null if same as default to avoid unnecessary localStorage entries
          setChartTypeOverride(type === defaultChartType ? null : type);
        }}
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

/**
 * Memoized weather chart to prevent unnecessary re-renders.
 */
export const WeatherChart = memo(WeatherChartInner);

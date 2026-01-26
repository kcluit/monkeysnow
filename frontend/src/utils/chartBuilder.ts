/**
 * Weather Chart Builder
 *
 * Transforms weather data and configurations into library-agnostic ChartConfig.
 * This bridges domain types (WeatherModel, WeatherVariable, etc.) to the
 * chart abstraction layer.
 */

import type { ChartConfig, ChartType, SeriesConfig, ChartTheme } from '../lib/charts';
import type { WeatherChartProps } from '../types/detailView';
import type { WeatherModel, HourlyDataPoint } from '../types/openMeteo';
import type { UnitSystem } from '../types';
import { getModelConfig, getVariableConfig } from './chartConfigurations';
import { getEChartsTheme } from '../lib/charts';

/**
 * Format a date for display on the X-axis.
 * @param date - The date to format
 * @param timezone - Optional IANA timezone string (e.g., "America/Vancouver")
 */
function formatTimeLabel(date: Date, timezone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
  };

  // Add timezone if provided
  if (timezone) {
    options.timeZone = timezone;
  }

  try {
    return date.toLocaleString('en-US', options);
  } catch {
    // Fallback to browser timezone if provided timezone is invalid
    delete options.timeZone;
    return date.toLocaleString('en-US', options);
  }
}

/**
 * Transform weather data into chart series format.
 * Returns time labels and series data for each selected model.
 * Uses null for missing values to create gaps in charts.
 */
function transformToChartData(
  data: Map<WeatherModel, HourlyDataPoint[]>,
  selectedModels: WeatherModel[],
  variable: string,
  unitSystem: UnitSystem,
  convertToImperial?: (value: number) => number,
  timezone?: string
): { timeLabels: string[]; seriesData: Map<WeatherModel, (number | null)[]> } {
  // Get time points from first available model
  const firstModelData = data.values().next().value as HourlyDataPoint[] | undefined;
  if (!firstModelData || firstModelData.length === 0) {
    return { timeLabels: [], seriesData: new Map() };
  }

  // Extract time labels with timezone formatting
  const timeLabels = firstModelData.map((point) => formatTimeLabel(point.time, timezone));

  // Extract series data for each model
  const seriesData = new Map<WeatherModel, (number | null)[]>();

  for (const model of selectedModels) {
    const modelData = data.get(model);
    if (!modelData) continue;

    const values = modelData.map((point) => {
      const value = point[variable];
      // Return null for missing data (creates gaps in charts)
      if (typeof value !== 'number') return null;

      // Convert to imperial if needed
      if (unitSystem === 'imperial' && convertToImperial) {
        return convertToImperial(value);
      }

      return value;
    });

    seriesData.set(model, values);
  }

  return { timeLabels, seriesData };
}

/**
 * Build series configurations from weather model data.
 * Skips models with no data or empty data arrays.
 */
function buildSeriesConfigs(
  seriesData: Map<WeatherModel, (number | null)[]>,
  selectedModels: WeatherModel[],
  chartType: ChartType
): SeriesConfig[] {
  const configs: SeriesConfig[] = [];

  for (const model of selectedModels) {
    const data = seriesData.get(model);
    // Skip if no data or empty array
    if (!data || data.length === 0) continue;

    const modelConfig = getModelConfig(model);

    configs.push({
      id: model,
      name: modelConfig.name,
      color: modelConfig.color,
      type: chartType,
      data,
      fillOpacity: chartType === 'area' ? 0.3 : undefined,
    });
  }

  return configs;
}

/**
 * Build a complete ChartConfig from weather data and props.
 */
export function buildWeatherChartConfig(
  props: WeatherChartProps,
  theme?: ChartTheme
): ChartConfig | null {
  const { data, selectedModels, variable, unitSystem, timezoneInfo, isChartLocked } = props;

  // Handle empty data
  if (!data || data.size === 0) {
    return null;
  }

  // Get variable configuration
  const variableConfig = getVariableConfig(variable);
  const chartType = variableConfig.chartType as ChartType;

  // Transform data with timezone
  const { timeLabels, seriesData } = transformToChartData(
    data,
    selectedModels,
    variable,
    unitSystem,
    variableConfig.convertToImperial,
    timezoneInfo?.timezone
  );

  // Handle no data after transformation
  if (timeLabels.length === 0) {
    return null;
  }

  // Build series
  const series = buildSeriesConfigs(seriesData, selectedModels, chartType);

  // Get unit string
  const unit = unitSystem === 'imperial' ? variableConfig.unitImperial : variableConfig.unit;

  // Use provided theme or get from CSS
  const chartTheme = theme ?? getEChartsTheme();

  return {
    type: chartType,
    xAxis: {
      type: 'category',
      data: timeLabels,
    },
    yAxis: {
      type: 'value',
      label: `${variableConfig.label} (${unit})`,
      domain: variableConfig.yAxisDomain,
      formatter: (value: number) => `${Math.round(value)}`,
    },
    series,
    tooltip: {
      enabled: true,
      trigger: 'axis',
    },
    legend: {
      enabled: true,
      position: 'bottom',
    },
    grid: {
      top: 10,
      right: 30,
      bottom: 80,
      left: 10,
      containLabel: true,
    },
    dataZoom: {
      enabled: !isChartLocked,
      type: isChartLocked ? 'inside' : 'both',
      range: [0, 100],
    },
    theme: chartTheme,
    height: 380,
    animation: false,
  };
}

/**
 * Get the variable metadata for display (label, unit, color).
 */
export function getVariableDisplayInfo(
  variable: string,
  unitSystem: UnitSystem
): { label: string; unit: string; color: string } {
  const config = getVariableConfig(variable as any);
  return {
    label: config.label,
    unit: unitSystem === 'imperial' ? config.unitImperial : config.unit,
    color: config.color,
  };
}

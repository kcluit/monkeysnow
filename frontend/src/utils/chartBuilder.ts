/**
 * Weather Chart Builder
 *
 * Transforms weather data and configurations into library-agnostic ChartConfig.
 * This bridges domain types (WeatherModel, WeatherVariable, etc.) to the
 * chart abstraction layer.
 */

import type { ChartConfig, ChartType, SeriesConfig, ChartTheme, MarkLineData } from '../lib/charts';
import type { WeatherChartProps } from '../types/detailView';
import type { WeatherModel, HourlyDataPoint, AggregationType } from '../types/openMeteo';
import type { UnitSystem } from '../types';
import type { ChartDisplayType, ElevationLocation } from '../types/chartSettings';
import { getModelConfig, getVariableConfig } from './chartConfigurations';
import { getEChartsTheme } from '../lib/charts';

/** Additional chart settings passed from WeatherChart component */
export interface ChartBuildSettings {
  chartTypeOverride?: ChartDisplayType;
  showAccumulation?: boolean;
  showElevationLines?: boolean;
  location?: ElevationLocation;
  currentElevation?: number;
}

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
 * Calculate median of an array of numbers.
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculate mean of an array of numbers.
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate aggregation series (median/mean) from model data.
 */
function calculateAggregationSeries(
  seriesData: Map<WeatherModel, (number | null)[]>,
  aggregations: AggregationType[],
  aggregationColors: Record<AggregationType, string>,
  chartType: ChartType,
  timePoints: number
): SeriesConfig[] {
  if (aggregations.length === 0 || seriesData.size < 2) {
    return [];
  }

  const allDataArrays = Array.from(seriesData.values());
  const configs: SeriesConfig[] = [];

  for (const aggType of aggregations) {
    const aggregatedData: (number | null)[] = [];

    for (let i = 0; i < timePoints; i++) {
      const valuesAtTime = allDataArrays
        .map((arr) => arr[i])
        .filter((v): v is number => v !== null && !isNaN(v));

      if (valuesAtTime.length === 0) {
        aggregatedData.push(null);
      } else {
        const value = aggType === 'median'
          ? calculateMedian(valuesAtTime)
          : calculateMean(valuesAtTime);
        aggregatedData.push(value);
      }
    }

    const color = aggregationColors[aggType] ?? (aggType === 'median' ? '#a855f7' : '#ec4899');
    const name = aggType === 'median' ? 'Median' : 'Mean';

    configs.push({
      id: aggType,
      name,
      color,
      type: chartType,
      data: aggregatedData,
      lineWidth: 2, // Same width as models, distinguished by opacity
      opacity: 1,
      zIndex: 100, // Render on top
    });
  }

  return configs;
}

/**
 * Calculate model line opacity based on number of selected models.
 * More models = lower opacity so aggregation lines stand out.
 */
function calculateModelOpacity(modelCount: number): number {
  // Scale opacity: fewer models = more visible, more models = more faded
  // Uses sqrt scaling for a smooth curve
  return Math.max(0.05, 0.5 / Math.sqrt(modelCount));
}

/**
 * Build series configurations from weather model data.
 * Skips models with no data or empty data arrays.
 */
function buildSeriesConfigs(
  seriesData: Map<WeatherModel, (number | null)[]>,
  selectedModels: WeatherModel[],
  chartType: ChartType,
  hasAggregations: boolean
): SeriesConfig[] {
  const configs: SeriesConfig[] = [];
  const modelOpacity = hasAggregations ? calculateModelOpacity(selectedModels.length) : 1;

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
      // Reduce opacity when aggregations are enabled, scaled by model count
      opacity: modelOpacity,
      lineWidth: 2,
      zIndex: 2,
    });
  }

  return configs;
}

/**
 * Calculate cumulative accumulation from series data.
 * Used for precipitation/snowfall accumulation overlay.
 *
 * Note: Null values are preserved as gaps but the running sum continues.
 * This is intentional for weather data where gaps represent missing data,
 * not periods with zero precipitation.
 */
function calculateAccumulation(values: (number | null)[]): (number | null)[] {
  let sum = 0;
  return values.map((v) => {
    if (v === null) return null;
    sum += v;
    return sum;
  });
}

/**
 * Build accumulation series from model data.
 * Creates a cumulative sum line for each model, plotted on the secondary Y-axis.
 * Returns multiple series (one per model) with solid lines.
 */
function buildAccumulationSeries(
  seriesData: Map<WeatherModel, (number | null)[]>,
  selectedModels: WeatherModel[]
): SeriesConfig[] {
  if (seriesData.size === 0) return [];

  const accumulationSeries: SeriesConfig[] = [];

  for (const model of selectedModels) {
    const modelData = seriesData.get(model);
    if (!modelData || modelData.length === 0) continue;

    const modelConfig = getModelConfig(model);

    // Calculate cumulative accumulation for this model
    const accumulationData = calculateAccumulation(modelData);

    accumulationSeries.push({
      id: `accumulation_${model}`,
      name: `${modelConfig.name} (Accum)`,
      color: modelConfig.color,
      type: 'line',
      data: accumulationData,
      lineWidth: 2,
      opacity: 0.9,
      zIndex: 50, // Above model series but below aggregations
      lineStyle: 'solid',
      yAxisIndex: 1, // Use secondary Y-axis (right side)
    });
  }

  return accumulationSeries;
}

/**
 * Adjust color brightness by a percentage.
 * Positive values lighten, negative values darken.
 */
function adjustColorBrightness(hex: string, percent: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Validate hex format (must be 6 hex characters)
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return hex; // Return original if invalid
  }

  // Parse RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Adjust brightness
  const adjust = (value: number) => {
    const adjusted = value + (value * percent / 100);
    return Math.max(0, Math.min(255, Math.round(adjusted)));
  };

  const newR = adjust(r).toString(16).padStart(2, '0');
  const newG = adjust(g).toString(16).padStart(2, '0');
  const newB = adjust(b).toString(16).padStart(2, '0');

  return `#${newR}${newG}${newB}`;
}

/**
 * Build elevation mark lines for freezing level chart.
 */
function buildElevationMarkLines(
  location: ElevationLocation,
  currentElevation: number | undefined,
  unitSystem: UnitSystem,
  theme: ChartTheme
): MarkLineData[] {
  const convert = unitSystem === 'imperial'
    ? (m: number) => Math.round(m * 3.28084) // meters to feet
    : (m: number) => m;

  const unitLabel = unitSystem === 'imperial' ? 'ft' : 'm';

  const elevations = [
    { name: 'Base', value: location.baseElevation },
    { name: 'Mid', value: location.midElevation },
    { name: 'Peak', value: location.topElevation },
  ];

  return elevations.map(({ name, value }) => {
    const isCurrent = value === currentElevation;
    return {
      yValue: convert(value),
      label: `${name}: ${convert(value)}${unitLabel}`,
      color: isCurrent ? theme.accent : theme.textSecondary,
      lineWidth: isCurrent ? 2 : 1,
      lineStyle: 'dashed' as const,
    };
  });
}

/**
 * Build a complete ChartConfig from weather data and props.
 */
export function buildWeatherChartConfig(
  props: WeatherChartProps,
  theme?: ChartTheme,
  settings?: ChartBuildSettings
): ChartConfig | null {
  const {
    data,
    selectedModels,
    selectedAggregations = [],
    aggregationColors = { median: '#a855f7', mean: '#ec4899' },
    variable,
    unitSystem,
    timezoneInfo,
    isChartLocked
  } = props;

  // Handle empty data
  if (!data || data.size === 0) {
    return null;
  }

  // Get variable configuration
  const variableConfig = getVariableConfig(variable);

  // Use chart type override if provided, otherwise use default from config
  const chartType = (settings?.chartTypeOverride ?? variableConfig.chartType) as ChartType;

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

  // Determine if we have aggregations enabled
  const hasAggregations = selectedAggregations.length > 0 && seriesData.size > 1;

  // Build model series (with reduced opacity if aggregations enabled)
  const modelSeries = buildSeriesConfigs(seriesData, selectedModels, chartType, hasAggregations);

  // Build aggregation series
  const aggregationSeries = calculateAggregationSeries(
    seriesData,
    selectedAggregations,
    aggregationColors,
    chartType,
    timeLabels.length
  );

  // Combine all series (aggregations rendered on top)
  const allSeries = [...modelSeries, ...aggregationSeries];

  // Track if we need a secondary Y-axis for accumulation
  let hasAccumulation = false;

  // Add accumulation series if enabled
  if (settings?.showAccumulation) {
    const accSeries = buildAccumulationSeries(seriesData, selectedModels);
    if (accSeries.length > 0) {
      allSeries.push(...accSeries);
      hasAccumulation = true;
    }
  }

  // Get unit string
  const unit = unitSystem === 'imperial' ? variableConfig.unitImperial : variableConfig.unit;

  // Use provided theme or get from CSS
  const chartTheme = theme ?? getEChartsTheme();

  // Build elevation mark lines if enabled
  let markLines: MarkLineData[] | undefined;
  if (settings?.showElevationLines && settings.location) {
    markLines = buildElevationMarkLines(
      settings.location,
      settings.currentElevation,
      unitSystem,
      chartTheme
    );
  }

  // When chart is locked, reduce bottom margin since there's no dataZoom slider
  // Keep enough space (60px) for legend labels that may wrap to multiple lines
  const gridBottom = isChartLocked ? 60 : 80;

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
    series: allSeries,
    markLines,
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
      bottom: gridBottom,
      left: 10,
      containLabel: true,
    },
    dataZoom: {
      enabled: !isChartLocked,
      type: 'both',
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

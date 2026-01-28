/**
 * Weather Chart Builder
 *
 * Transforms weather data and configurations into library-agnostic ChartConfig.
 * This bridges domain types (WeatherModel, WeatherVariable, etc.) to the
 * chart abstraction layer.
 */

import type { ChartConfig, ChartType, SeriesConfig, ChartTheme, BoxWhiskerData, HeatmapData } from '../lib/charts';
import type { WeatherChartProps } from '../types/detailView';
import type { WeatherModel, HourlyDataPoint, AggregationType } from '../types/openMeteo';
import type { UnitSystem } from '../types';
import type { ChartDisplayType } from '../types/chartSettings';
import { getModelConfig, getVariableConfig } from './chartConfigurations';
import { getUPlotTheme } from '../lib/charts';
import { aggregationOptions } from '../data/modelHierarchy';

/** Additional chart settings passed from WeatherChart component */
export interface ChartBuildSettings {
    chartTypeOverride?: ChartDisplayType;
    showAccumulation?: boolean;
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

    const expectedLength = firstModelData.length;

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
            // Also handle NaN values (typeof NaN === 'number' is true!)
            if (typeof value !== 'number' || !Number.isFinite(value)) return null;

            // Convert to imperial if needed
            if (unitSystem === 'imperial' && convertToImperial) {
                const converted = convertToImperial(value);
                // Ensure converted value is also valid
                return Number.isFinite(converted) ? converted : null;
            }

            return value;
        });

        // Ensure all series have the same length (pad with nulls if needed)
        if (values.length < expectedLength) {
            const padding = new Array(expectedLength - values.length).fill(null);
            values.push(...padding);
        } else if (values.length > expectedLength) {
            values.length = expectedLength;
        }

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
 * Calculate minimum of an array of numbers.
 */
function calculateMin(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.min(...values);
}

/**
 * Calculate maximum of an array of numbers.
 */
function calculateMax(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.max(...values);
}

/**
 * Calculate percentile of an array of numbers.
 * @param values - Array of numbers
 * @param percentile - Percentile to calculate (0-100)
 */
function calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    // Linear interpolation between lower and upper bounds
    const fraction = index - lower;
    return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
}

/**
 * Calculate aggregation value based on type.
 */
function calculateAggregationValue(values: number[], aggType: AggregationType): number {
    switch (aggType) {
        case 'median':
            return calculateMedian(values);
        case 'mean':
            return calculateMean(values);
        case 'min':
            return calculateMin(values);
        case 'max':
            return calculateMax(values);
        case 'p25':
            return calculatePercentile(values, 25);
        case 'p75':
            return calculatePercentile(values, 75);
        default:
            return calculateMean(values);
    }
}

/**
 * Get display name for aggregation type.
 */
function getAggregationDisplayName(aggType: AggregationType): string {
    switch (aggType) {
        case 'median':
            return 'Median';
        case 'mean':
            return 'Mean';
        case 'min':
            return 'Min';
        case 'max':
            return 'Max';
        case 'p25':
            return '25th %ile';
        case 'p75':
            return '75th %ile';
        default:
            return aggType;
    }
}

/**
 * Get default color for aggregation type.
 * Uses the single source of truth from aggregationOptions.
 */
function getDefaultAggregationColor(aggType: AggregationType): string {
    return aggregationOptions.find(a => a.id === aggType)?.defaultColor ?? '#8b5cf6';
}

/**
 * Calculate aggregation series from model data.
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
                aggregatedData.push(calculateAggregationValue(valuesAtTime, aggType));
            }
        }

        const color = aggregationColors[aggType] ?? getDefaultAggregationColor(aggType);
        const name = getAggregationDisplayName(aggType);

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
 * Build band fill series for aggregation ranges.
 * Creates band fills between complementary aggregation pairs (min/max, p25/p75).
 */
function buildBandFillSeries(
    seriesData: Map<WeatherModel, (number | null)[]>,
    aggregations: AggregationType[],
    aggregationColors: Record<AggregationType, string>,
    timePoints: number
): SeriesConfig[] {
    if (aggregations.length < 2 || seriesData.size < 2) {
        return [];
    }

    const allDataArrays = Array.from(seriesData.values());
    const configs: SeriesConfig[] = [];

    // Check for band pairs
    const hasMinMax = aggregations.includes('min') && aggregations.includes('max');
    const hasPercentiles = aggregations.includes('p25') && aggregations.includes('p75');

    // Helper to calculate aggregation data
    const calculateAggData = (aggType: AggregationType): (number | null)[] => {
        const data: (number | null)[] = [];
        for (let i = 0; i < timePoints; i++) {
            const valuesAtTime = allDataArrays
                .map((arr) => arr[i])
                .filter((v): v is number => v !== null && !isNaN(v));
            if (valuesAtTime.length === 0) {
                data.push(null);
            } else {
                data.push(calculateAggregationValue(valuesAtTime, aggType));
            }
        }
        return data;
    };

    // Build min-max band if both are selected
    if (hasMinMax) {
        const minData = calculateAggData('min');
        const maxData = calculateAggData('max');
        const color = aggregationColors['max'] ?? getDefaultAggregationColor('max');

        configs.push({
            id: 'band_min_max',
            name: 'Min-Max Range',
            color,
            type: 'band',
            data: maxData, // Use max data for y-scale calculation
            fillOpacity: 0.1,
            bandData: {
                upper: maxData,
                lower: minData,
            },
            zIndex: 1, // Render behind lines
        });
    }

    // Build p25-p75 band if both are selected
    if (hasPercentiles) {
        const p25Data = calculateAggData('p25');
        const p75Data = calculateAggData('p75');
        const color = aggregationColors['p75'] ?? getDefaultAggregationColor('p75');

        configs.push({
            id: 'band_p25_p75',
            name: '25th-75th Percentile',
            color,
            type: 'band',
            data: p75Data, // Use p75 data for y-scale calculation
            fillOpacity: 0.15,
            bandData: {
                upper: p75Data,
                lower: p25Data,
            },
            zIndex: 1, // Render behind lines
        });
    }

    return configs;
}

/**
 * Build series configurations from weather model data.
 * Skips models with no data or empty data arrays.
 * @param hideAggregationMembers - If true and aggregations are present, skip model series entirely
 */
function buildSeriesConfigs(
    seriesData: Map<WeatherModel, (number | null)[]>,
    selectedModels: WeatherModel[],
    chartType: ChartType,
    hasAggregations: boolean,
    hideAggregationMembers: boolean = false
): SeriesConfig[] {
    // Skip model series entirely if hiding members and aggregations are active
    if (hideAggregationMembers && hasAggregations) {
        return [];
    }

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
 * Calculate box-whisker data from model ensemble.
 * Computes min/Q1/median/Q3/max across all models at each time point.
 */
function calculateBoxWhiskerData(
    seriesData: Map<WeatherModel, (number | null)[]>,
    timePoints: number
): BoxWhiskerData {
    const min: (number | null)[] = [];
    const q1: (number | null)[] = [];
    const median: (number | null)[] = [];
    const q3: (number | null)[] = [];
    const max: (number | null)[] = [];

    const allDataArrays = Array.from(seriesData.values());

    for (let i = 0; i < timePoints; i++) {
        const valuesAtTime = allDataArrays
            .map((arr) => arr[i])
            .filter((v): v is number => v !== null && Number.isFinite(v));

        if (valuesAtTime.length === 0) {
            min.push(null);
            q1.push(null);
            median.push(null);
            q3.push(null);
            max.push(null);
        } else {
            min.push(calculateMin(valuesAtTime));
            q1.push(calculatePercentile(valuesAtTime, 25));
            median.push(calculateMedian(valuesAtTime));
            q3.push(calculatePercentile(valuesAtTime, 75));
            max.push(calculateMax(valuesAtTime));
        }
    }

    return { min, q1, median, q3, max };
}

/**
 * Build a complete ChartConfig from weather data and props.
 */
export function buildWeatherChartConfig(
    props: WeatherChartProps,
    theme?: ChartTheme,
    settings?: ChartBuildSettings
): ChartConfig | null {
    // Build default colors from single source of truth
    const defaultAggregationColors = Object.fromEntries(
        aggregationOptions.map(a => [a.id, a.defaultColor])
    ) as Record<AggregationType, string>;

    const {
        data,
        selectedModels,
        selectedAggregations = [],
        aggregationColors = defaultAggregationColors,
        hideAggregationMembers = false,
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

    // Build model series (with reduced opacity if aggregations enabled, or hidden if hideAggregationMembers)
    const modelSeries = buildSeriesConfigs(seriesData, selectedModels, chartType, hasAggregations, hideAggregationMembers);

    // Build aggregation series
    const aggregationSeries = calculateAggregationSeries(
        seriesData,
        selectedAggregations,
        aggregationColors,
        chartType,
        timeLabels.length
    );

    // Build band fill series for aggregation ranges (e.g., min-max, p25-p75)
    const bandSeries = buildBandFillSeries(
        seriesData,
        selectedAggregations,
        aggregationColors,
        timeLabels.length
    );

    // Build box & whisker series if chart type is boxwhisker
    const boxWhiskerSeriesList: SeriesConfig[] = [];
    if (chartType === 'boxwhisker' && seriesData.size > 1) {
        const boxWhiskerData = calculateBoxWhiskerData(seriesData, timeLabels.length);
        boxWhiskerSeriesList.push({
            id: 'ensemble_boxwhisker',
            name: 'Ensemble Spread',
            color: aggregationColors['median'] ?? variableConfig.color,
            type: 'boxwhisker',
            data: boxWhiskerData.median, // Use median for y-scale calculation
            boxWhiskerData,
            zIndex: 50,
        });
    }

    // Combine all series: bands first (background), then models, then aggregations (foreground)
    // For boxwhisker, skip regular model/aggregation series and use boxwhisker series instead
    const allSeries = chartType === 'boxwhisker'
        ? [...boxWhiskerSeriesList]
        : [...bandSeries, ...modelSeries, ...aggregationSeries];

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
    const chartTheme = theme ?? getUPlotTheme();

    // Build secondary Y-axis config if accumulation is enabled
    const yAxisSecondary = hasAccumulation
        ? {
            type: 'value' as const,
            label: `Accumulation (${unit})`,
            formatter: (value: number) => `${Math.round(value)}`,
        }
        : undefined;

    return {
        type: chartType,
        variable, // Pass variable for plugin decisions (e.g., zero axis exclusion)
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
        yAxisSecondary,
        series: allSeries,
        grid: {
            top: 10,
            right: 0,
            bottom: 70,
            left: 0,
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

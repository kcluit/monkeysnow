/**
 * Weather Chart Builder
 *
 * Transforms weather data and configurations into library-agnostic ChartConfig.
 * This bridges domain types (WeatherModel, WeatherVariable, etc.) to the
 * chart abstraction layer.
 */

import type { ChartConfig, ChartType, SeriesConfig, ChartTheme, BoxWhiskerData, HeatmapData, WindArrowData } from '../lib/charts';
import type { WeatherChartProps } from '../types/detailView';
import type { WeatherModel, HourlyDataPoint, AggregationType } from '../types/openMeteo';
import type { UnitSystem } from '../types';
import type { ChartDisplayType } from '../types/chartSettings';
import { getModelConfig, getVariableConfig, getOverlayConfig, hasOverlays } from './chartConfigurations';
import { getUPlotTheme } from '../lib/charts';
import { aggregationOptions } from '../data/modelHierarchy';

/** Additional chart settings passed from WeatherChart component */
export interface ChartBuildSettings {
    chartTypeOverride?: ChartDisplayType;
    showAccumulation?: boolean;
    /** Show multi-level overlays (e.g., wind at different altitudes) */
    showOverlays?: boolean;
    /** Custom chart height in pixels (default: 300, or 300 for heatmaps) */
    customHeight?: number;
}

/**
 * Get the hour of a date in the specified timezone.
 * @param date - The date to get the hour from
 * @param timezone - Optional IANA timezone string
 * @returns The hour (0-23) in the specified timezone
 */
function getHourInTimezone(date: Date, timezone?: string): number {
    try {
        if (timezone) {
            const timeStr = date.toLocaleString('en-US', {
                timeZone: timezone,
                hour: 'numeric',
                hour12: false,
            });
            let hour = parseInt(timeStr.trim());
            // Handle edge case where midnight might be formatted as 24
            if (hour === 24) hour = 0;
            return hour;
        }
    } catch {
        // Fall through to default
    }
    return date.getHours();
}

/**
 * Format a date for display on the X-axis.
 * - At midnight (12 AM): "Wed Jan 29" (day of week + date)
 * - Other hours: "5 PM" (hour only)
 * @param date - The date to format
 * @param timezone - Optional IANA timezone string (e.g., "America/Vancouver")
 */
function formatTimeLabel(date: Date, timezone?: string): string {
    const hour = getHourInTimezone(date, timezone);
    const isMidnight = hour === 0;

    if (isMidnight) {
        // Format as "Wed Jan 29"
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        };
        if (timezone) options.timeZone = timezone;

        try {
            return date.toLocaleString('en-US', options);
        } catch {
            delete options.timeZone;
            return date.toLocaleString('en-US', options);
        }
    } else {
        // Format as "5 PM" (hour only)
        const options: Intl.DateTimeFormatOptions = {
            hour: 'numeric',
        };
        if (timezone) options.timeZone = timezone;

        try {
            return date.toLocaleString('en-US', options);
        } catch {
            delete options.timeZone;
            return date.toLocaleString('en-US', options);
        }
    }
}

/**
 * Format a date for tooltip display with full date and time.
 * Format: "Tue Feb 3, 4 AM"
 * @param date - The date to format
 * @param timezone - Optional IANA timezone string (e.g., "America/Vancouver")
 */
function formatTooltipLabel(date: Date, timezone?: string): string {
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
    };
    if (timezone) options.timeZone = timezone;

    try {
        return date.toLocaleString('en-US', options);
    } catch {
        delete options.timeZone;
        return date.toLocaleString('en-US', options);
    }
}

/**
 * Transform weather data into chart series format.
 * Returns time labels, tooltip labels, midnight indices, and series data for each selected model.
 * Uses null for missing values to create gaps in charts.
 */
function transformToChartData(
    data: Map<WeatherModel, HourlyDataPoint[]>,
    selectedModels: WeatherModel[],
    variable: string,
    unitSystem: UnitSystem,
    convertToImperial?: (value: number) => number,
    timezone?: string
): { timeLabels: string[]; tooltipLabels: string[]; midnightIndices: number[]; seriesData: Map<WeatherModel, (number | null)[]> } {
    // Get time points from first available model
    const firstModelData = data.values().next().value as HourlyDataPoint[] | undefined;
    if (!firstModelData || firstModelData.length === 0) {
        return { timeLabels: [], tooltipLabels: [], midnightIndices: [], seriesData: new Map() };
    }

    const expectedLength = firstModelData.length;

    // Extract time labels with timezone formatting and track midnight indices
    const timeLabels: string[] = [];
    const tooltipLabels: string[] = [];
    const midnightIndices: number[] = [];

    firstModelData.forEach((point, index) => {
        const hour = getHourInTimezone(point.time, timezone);
        if (hour === 0) {
            midnightIndices.push(index);
        }
        timeLabels.push(formatTimeLabel(point.time, timezone));
        tooltipLabels.push(formatTooltipLabel(point.time, timezone));
    });

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

    return { timeLabels, tooltipLabels, midnightIndices, seriesData };
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
            fillOpacity: 0.05,
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
            fillOpacity: 0.05,
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
 * Build overlay series for multi-level variables (e.g., wind at different altitudes).
 * Shows median across models for each overlay level.
 */
function buildOverlaySeries(
    data: Map<WeatherModel, HourlyDataPoint[]>,
    selectedModels: WeatherModel[],
    baseVariable: string,
    unitSystem: UnitSystem,
    chartType: ChartType,
    timezone?: string
): SeriesConfig[] {
    const overlayConfig = getOverlayConfig(baseVariable as any);
    if (!overlayConfig) return [];

    const series: SeriesConfig[] = [];

    for (const overlay of overlayConfig.overlays) {
        const overlayVarConfig = getVariableConfig(overlay.variable);

        // Transform overlay data
        const { seriesData } = transformToChartData(
            data,
            selectedModels,
            overlay.variable,
            unitSystem,
            overlayVarConfig.convertToImperial,
            timezone
        );

        // Skip if no data
        if (seriesData.size === 0) continue;

        // Calculate median across models for this overlay
        const allDataArrays = Array.from(seriesData.values());
        const timePoints = allDataArrays[0]?.length ?? 0;
        const medianData: (number | null)[] = [];

        for (let i = 0; i < timePoints; i++) {
            const valuesAtTime = allDataArrays
                .map((arr) => arr[i])
                .filter((v): v is number => v !== null && !isNaN(v));

            if (valuesAtTime.length === 0) {
                medianData.push(null);
            } else {
                medianData.push(calculateMedian(valuesAtTime));
            }
        }

        series.push({
            id: overlay.variable,
            name: overlay.label,
            color: overlay.color,
            type: chartType,
            data: medianData,
            lineWidth: 2,
            opacity: overlay.opacity ?? 0.7,
            zIndex: 60, // Above models, below aggregations
        });
    }

    return series;
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
 * Transform time-series data into hour-of-day heatmap format.
 * Groups data by hour (0-23) and date, computing median across models for each cell.
 */
function transformToHeatmap(
    data: Map<WeatherModel, HourlyDataPoint[]>,
    selectedModels: WeatherModel[],
    variable: string,
    unitSystem: UnitSystem,
    convertToImperial?: (value: number) => number,
    timezone?: string
): HeatmapData {
    // Get time points from first available model
    const firstModelData = data.values().next().value as HourlyDataPoint[] | undefined;
    if (!firstModelData || firstModelData.length === 0) {
        return { hours: [], dates: [], values: [] };
    }

    // Group data points by date and hour
    const dateHourMap = new Map<string, Map<number, number[]>>();
    const dateOrder: string[] = [];

    for (const point of firstModelData) {
        const date = new Date(point.time);

        // Apply timezone if provided
        let dateStr: string;
        let hour: number;

        if (timezone) {
            try {
                const options: Intl.DateTimeFormatOptions = {
                    timeZone: timezone,
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                };
                dateStr = date.toLocaleDateString('en-US', options);
                hour = parseInt(date.toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }));
            } catch {
                dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                hour = date.getHours();
            }
        } else {
            dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            hour = date.getHours();
        }

        // Track date order
        if (!dateHourMap.has(dateStr)) {
            dateHourMap.set(dateStr, new Map());
            dateOrder.push(dateStr);
        }

        const hourMap = dateHourMap.get(dateStr)!;
        if (!hourMap.has(hour)) {
            hourMap.set(hour, []);
        }

        // Collect values from all models at this time point
        for (const model of selectedModels) {
            const modelData = data.get(model);
            if (!modelData) continue;

            const idx = firstModelData.indexOf(point);
            if (idx >= 0 && idx < modelData.length) {
                const value = modelData[idx][variable];
                if (typeof value === 'number' && Number.isFinite(value)) {
                    let finalValue = value;
                    if (unitSystem === 'imperial' && convertToImperial) {
                        const converted = convertToImperial(value);
                        if (Number.isFinite(converted)) {
                            finalValue = converted;
                        }
                    }
                    hourMap.get(hour)!.push(finalValue);
                }
            }
        }
    }

    // Build the values matrix [hour][date]
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dates = dateOrder;
    const values: (number | null)[][] = [];

    for (let h = 0; h < 24; h++) {
        const hourRow: (number | null)[] = [];
        for (const dateStr of dates) {
            const hourMap = dateHourMap.get(dateStr);
            const cellValues = hourMap?.get(h);
            if (cellValues && cellValues.length > 0) {
                hourRow.push(calculateMedian(cellValues));
            } else {
                hourRow.push(null);
            }
        }
        values.push(hourRow);
    }

    return { hours, dates, values };
}

/**
 * Extract wind direction data for wind arrow overlay.
 * Returns the median direction across all models at each time point.
 */
function extractWindDirectionData(
    data: Map<WeatherModel, HourlyDataPoint[]>,
    selectedModels: WeatherModel[],
    timePoints: number
): WindArrowData {
    const direction: (number | null)[] = [];

    // Get time points from first available model
    const firstModelData = data.values().next().value as HourlyDataPoint[] | undefined;
    if (!firstModelData) {
        return { direction: [] };
    }

    for (let i = 0; i < timePoints; i++) {
        const directionsAtTime: number[] = [];

        for (const model of selectedModels) {
            const modelData = data.get(model);
            if (!modelData || i >= modelData.length) continue;

            const dir = modelData[i]['wind_direction_10m'];
            if (typeof dir === 'number' && Number.isFinite(dir)) {
                directionsAtTime.push(dir);
            }
        }

        if (directionsAtTime.length === 0) {
            direction.push(null);
        } else {
            // Use circular mean for wind directions (handles 0°/360° boundary correctly)
            // Convert to unit vectors, average, then convert back to angle
            const radians = directionsAtTime.map(d => d * Math.PI / 180);
            const avgX = radians.reduce((sum, r) => sum + Math.cos(r), 0) / radians.length;
            const avgY = radians.reduce((sum, r) => sum + Math.sin(r), 0) / radians.length;
            let circularMean = Math.atan2(avgY, avgX) * 180 / Math.PI;
            if (circularMean < 0) circularMean += 360; // Normalize to 0-360
            direction.push(circularMean);
        }
    }

    return { direction };
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
        showMinMaxFill = false,
        showPercentileFill = false,
        variable,
        unitSystem,
        timezoneInfo,
        isChartLocked,
        location,
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
    const { timeLabels, tooltipLabels, midnightIndices, seriesData } = transformToChartData(
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
    // Filter based on user toggle settings
    const allBandSeries = buildBandFillSeries(
        seriesData,
        selectedAggregations,
        aggregationColors,
        timeLabels.length
    );
    const bandSeries = allBandSeries.filter(band => {
        if (band.id === 'band_min_max' && !showMinMaxFill) return false;
        if (band.id === 'band_p25_p75' && !showPercentileFill) return false;
        return true;
    });

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

    // Build heatmap series if chart type is heatmap
    const heatmapSeriesList: SeriesConfig[] = [];
    if (chartType === 'heatmap') {
        const heatmapData = transformToHeatmap(
            data,
            selectedModels,
            variable,
            unitSystem,
            variableConfig.convertToImperial,
            timezoneInfo?.timezone
        );
        if (heatmapData.dates.length > 0) {
            heatmapSeriesList.push({
                id: 'heatmap',
                name: `${variableConfig.label} by Hour`,
                color: variableConfig.color,
                type: 'heatmap',
                data: [], // Heatmap doesn't use standard data array
                heatmapData,
                zIndex: 1,
            });
        }
    }

    // Combine all series based on chart type
    let allSeries: SeriesConfig[];
    if (chartType === 'boxwhisker') {
        allSeries = [...boxWhiskerSeriesList];
    } else if (chartType === 'heatmap') {
        allSeries = [...heatmapSeriesList];
    } else {
        // Standard chart types: bands first (background), then models, then aggregations (foreground)
        allSeries = [...bandSeries, ...modelSeries, ...aggregationSeries];
    }

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

    // Add multi-level overlay series if enabled (e.g., wind at different altitudes)
    if (settings?.showOverlays && hasOverlays(variable as any) && chartType !== 'heatmap' && chartType !== 'boxwhisker') {
        const overlaySeries = buildOverlaySeries(
            data,
            selectedModels,
            variable,
            unitSystem,
            chartType,
            timezoneInfo?.timezone
        );
        if (overlaySeries.length > 0) {
            allSeries.push(...overlaySeries);
        }
    }

    // Add wind direction arrows for wind speed charts
    if (variable === 'wind_speed_10m' && chartType !== 'heatmap' && chartType !== 'boxwhisker') {
        const windArrowData = extractWindDirectionData(data, selectedModels, timeLabels.length);
        // Only add if we have direction data
        if (windArrowData.direction.some(d => d !== null)) {
            allSeries.push({
                id: 'wind_direction_arrows',
                name: 'Wind Direction',
                color: '#94a3b8', // slate-400 - subtle gray that works on most themes
                type: 'line', // Type doesn't matter for arrow overlay, but needs a valid type
                data: [], // No line data, just arrow overlay
                windArrowData,
                zIndex: 200, // Draw on top
            });
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

    // For heatmaps, use dates as x-axis labels; otherwise use time labels
    const xAxisData = chartType === 'heatmap' && heatmapSeriesList[0]?.heatmapData
        ? heatmapSeriesList[0].heatmapData.dates
        : timeLabels;

    // For heatmaps, adjust grid to accommodate hour labels on left
    const gridConfig = chartType === 'heatmap'
        ? { top: 10, right: 10, bottom: 1, left: 50, containLabel: false }
        : { top: 10, right: 0, bottom: 1, left: 0, containLabel: true };

    // Build elevation lines config for freezing level chart
    const M_TO_FT = 3.28084;
    const elevationLines = variable === 'freezing_level_height' && location ? {
        base: unitSystem === 'imperial' ? location.baseElevation * M_TO_FT : location.baseElevation,
        mid: unitSystem === 'imperial' ? location.midElevation * M_TO_FT : location.midElevation,
        top: unitSystem === 'imperial' ? location.topElevation * M_TO_FT : location.topElevation,
        unit: unitSystem === 'imperial' ? 'ft' : 'm',
    } : undefined;

    return {
        type: chartType,
        variable, // Pass variable for plugin decisions (e.g., zero axis exclusion)
        xAxis: {
            type: 'category',
            data: xAxisData,
            // Pass midnight indices for non-heatmap charts to ensure midnight ticks are always shown
            midnightIndices: chartType !== 'heatmap' ? midnightIndices : undefined,
            // Full date+time labels for tooltip display (non-heatmap only)
            tooltipLabels: chartType !== 'heatmap' ? tooltipLabels : undefined,
        },
        yAxis: {
            type: 'value',
            label: chartType === 'heatmap' ? 'Hour of Day' : `${variableConfig.label} (${unit})`,
            domain: chartType === 'heatmap' ? [0, 23] : variableConfig.yAxisDomain,
            formatter: (value: number) => chartType === 'heatmap' ? `${Math.round(value)}:00` : `${Math.round(value)}`,
        },
        yAxisSecondary,
        series: allSeries,
        grid: gridConfig,
        dataZoom: {
            enabled: !isChartLocked && chartType !== 'heatmap', // Disable zoom for heatmaps
            type: 'both',
            range: [0, 100],
        },
        theme: chartTheme,
        height: settings?.customHeight ?? (chartType === 'heatmap' ? 300 : 380),
        animation: false,
        elevationLines,
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

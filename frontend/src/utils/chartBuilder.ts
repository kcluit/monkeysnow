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
import type { UnitSystem, ModelLineOpacity } from '../types';
import { supportsAccumulation } from '../types/chartSettings';
import type { ChartDisplayType } from '../types/chartSettings';
import { getModelConfig, getVariableConfig, getOverlayConfig, hasOverlays } from './chartConfigurations';
import { getUPlotTheme } from '../lib/charts';
import { aggregationOptions } from '../data/modelHierarchy';
import { axisIndexOf, type TimeAxis } from './timeAxis';

/** Additional chart settings passed from WeatherChart component */
export interface ChartBuildSettings {
    chartTypeOverride?: ChartDisplayType;
    showAccumulation?: boolean;
    /** Show multi-level overlays (e.g., wind at different altitudes) */
    showOverlays?: boolean;
    /** Custom chart height in pixels (default: 300, or 300 for heatmaps) */
    customHeight?: number;
}

/** One value per point of the time axis; null leaves a gap in the chart. */
type Series = (number | null)[];

/**
 * Each model's values for a variable, placed on the shared time axis by timestamp
 * (models fetched hours apart can start on different days) and converted to the
 * visitor's units. Missing and non-finite values become null.
 */
function extractSeries(
    data: ReadonlyMap<WeatherModel, HourlyDataPoint[]>,
    models: WeatherModel[],
    variable: string,
    axis: TimeAxis,
    unitSystem: UnitSystem,
    convertToImperial?: (value: number) => number
): Map<WeatherModel, Series> {
    const convert = unitSystem === 'imperial' ? convertToImperial : undefined;
    const seriesData = new Map<WeatherModel, Series>();

    for (const model of models) {
        const points = data.get(model);
        if (!points) continue;

        const values: Series = new Array(axis.timestamps.length).fill(null);
        for (const point of points) {
            const value = point[variable];
            // typeof NaN === 'number', so check finiteness too
            if (typeof value !== 'number' || !Number.isFinite(value)) continue;
            const index = axisIndexOf(axis, point.timestamp);
            if (index === -1) continue;
            const converted = convert ? convert(value) : value;
            if (Number.isFinite(converted)) values[index] = converted;
        }
        seriesData.set(model, values);
    }

    return seriesData;
}

/** Linear interpolation between the two nearest ranks of an ascending array. */
function percentileOfSorted(sorted: number[], percentile: number): number {
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower]);
}

function statisticOf(sorted: number[], aggType: AggregationType): number {
    switch (aggType) {
        case 'median':
            return percentileOfSorted(sorted, 50);
        case 'min':
            return sorted[0];
        case 'max':
            return sorted[sorted.length - 1];
        case 'p25':
            return percentileOfSorted(sorted, 25);
        case 'p75':
            return percentileOfSorted(sorted, 75);
        case 'mean':
        default:
            return sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
    }
}

/**
 * Hour-by-hour statistics across several series, each hour's values sorted once
 * no matter how many statistics are wanted.
 */
function computeStatistics(
    series: Series[],
    length: number,
    wanted: ReadonlySet<AggregationType>
): Map<AggregationType, Series> {
    const result = new Map<AggregationType, Series>();
    for (const aggType of wanted) result.set(aggType, new Array(length).fill(null));
    if (wanted.size === 0) return result;

    const values: number[] = [];
    for (let i = 0; i < length; i++) {
        values.length = 0;
        for (const s of series) {
            const v = s[i];
            if (v !== null) values.push(v);
        }
        if (values.length === 0) continue;
        values.sort((a, b) => a - b);
        for (const aggType of wanted) result.get(aggType)![i] = statisticOf(values, aggType);
    }

    return result;
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
 * Aggregation lines (median, mean, ...) drawn on top of the model lines.
 */
function buildAggregationSeries(
    statistics: Map<AggregationType, Series>,
    aggregations: AggregationType[],
    aggregationColors: Record<AggregationType, string>,
    chartType: ChartType
): SeriesConfig[] {
    return aggregations.map((aggType) => ({
        id: aggType,
        name: getAggregationDisplayName(aggType),
        color: aggregationColors[aggType] ?? getDefaultAggregationColor(aggType),
        type: chartType,
        data: statistics.get(aggType)!,
        lineWidth: 2, // Same width as models, distinguished by opacity
        opacity: 1,
        zIndex: 100, // Render on top
    }));
}

/**
 * Band fills between complementary aggregation pairs (min/max, p25/p75).
 */
function buildBandSeries(
    statistics: Map<AggregationType, Series>,
    showMinMax: boolean,
    showPercentiles: boolean,
    aggregationColors: Record<AggregationType, string>
): SeriesConfig[] {
    const bands: SeriesConfig[] = [];

    if (showMinMax) {
        const maxData = statistics.get('max')!;
        bands.push({
            id: 'band_min_max',
            name: 'Min-Max Range',
            color: aggregationColors['max'] ?? getDefaultAggregationColor('max'),
            type: 'band',
            data: maxData, // Use max data for y-scale calculation
            fillOpacity: 0.05,
            bandData: { upper: maxData, lower: statistics.get('min')! },
            zIndex: 1, // Render behind lines
        });
    }

    if (showPercentiles) {
        const p75Data = statistics.get('p75')!;
        bands.push({
            id: 'band_p25_p75',
            name: '25th-75th Percentile',
            color: aggregationColors['p75'] ?? getDefaultAggregationColor('p75'),
            type: 'band',
            data: p75Data, // Use p75 data for y-scale calculation
            fillOpacity: 0.05,
            bandData: { upper: p75Data, lower: statistics.get('p25')! },
            zIndex: 1, // Render behind lines
        });
    }

    return bands;
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
 * @param hideAggregationMembers - If true and aggregations are present, skip model series entirely
 */
function buildSeriesConfigs(
    seriesData: Map<WeatherModel, Series>,
    selectedModels: WeatherModel[],
    chartType: ChartType,
    hasAggregations: boolean,
    hideAggregationMembers: boolean = false,
    modelLineOpacity: ModelLineOpacity = 'auto'
): SeriesConfig[] {
    // Skip model series entirely if hiding members and aggregations are active
    if (hideAggregationMembers && hasAggregations) {
        return [];
    }

    const configs: SeriesConfig[] = [];
    const modelOpacity = hasAggregations
        ? (modelLineOpacity === 'auto' ? calculateModelOpacity(selectedModels.length) : modelLineOpacity)
        : 1;

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
function calculateAccumulation(values: Series): Series {
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
    seriesData: Map<WeatherModel, Series>,
    selectedModels: WeatherModel[]
): SeriesConfig[] {
    if (seriesData.size === 0) return [];

    const accumulationSeries: SeriesConfig[] = [];

    for (const model of selectedModels) {
        const modelData = seriesData.get(model);
        if (!modelData || modelData.length === 0) continue;

        const modelConfig = getModelConfig(model);

        accumulationSeries.push({
            id: `accumulation_${model}`,
            name: `${modelConfig.name} (Accum)`,
            color: modelConfig.color,
            type: 'line',
            data: calculateAccumulation(modelData),
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
    data: ReadonlyMap<WeatherModel, HourlyDataPoint[]>,
    selectedModels: WeatherModel[],
    baseVariable: string,
    axis: TimeAxis,
    unitSystem: UnitSystem,
    chartType: ChartType
): SeriesConfig[] {
    const overlayConfig = getOverlayConfig(baseVariable as any);
    if (!overlayConfig) return [];

    const series: SeriesConfig[] = [];

    for (const overlay of overlayConfig.overlays) {
        const overlayVarConfig = getVariableConfig(overlay.variable);
        const seriesData = extractSeries(data, selectedModels, overlay.variable, axis, unitSystem, overlayVarConfig.convertToImperial);
        if (seriesData.size === 0) continue;

        const median = computeStatistics(Array.from(seriesData.values()), axis.timestamps.length, new Set(['median']));

        series.push({
            id: overlay.variable,
            name: overlay.label,
            color: overlay.color,
            type: chartType,
            data: median.get('median')!,
            lineWidth: 2,
            opacity: overlay.opacity ?? 0.7,
            zIndex: 60, // Above models, below aggregations
        });
    }

    return series;
}

/**
 * Hour-of-day heatmap: one column per local day, one row per hour, each cell the
 * median across models.
 */
function buildHeatmapData(seriesData: Map<WeatherModel, Series>, axis: TimeAxis): HeatmapData {
    const cells: number[][][] = Array.from({ length: 24 }, () => axis.days.map(() => []));

    for (const values of seriesData.values()) {
        values.forEach((value, i) => {
            if (value !== null) cells[axis.hours[i]][axis.dayIndex[i]].push(value);
        });
    }

    return {
        hours: Array.from({ length: 24 }, (_, h) => h),
        dates: axis.days,
        values: cells.map((row) => row.map((cell) =>
            cell.length > 0 ? percentileOfSorted(cell.sort((a, b) => a - b), 50) : null
        )),
    };
}

/**
 * Wind direction for the arrow overlay: the circular mean across models at each
 * point, which handles the 0°/360° boundary correctly.
 */
function buildWindArrowData(
    data: ReadonlyMap<WeatherModel, HourlyDataPoint[]>,
    selectedModels: WeatherModel[],
    axis: TimeAxis
): WindArrowData {
    const directions = Array.from(extractSeries(data, selectedModels, 'wind_direction_10m', axis, 'metric').values());

    const direction: Series = axis.timestamps.map((_, i) => {
        let x = 0;
        let y = 0;
        let count = 0;
        for (const series of directions) {
            const degrees = series[i];
            if (degrees === null) continue;
            const radians = degrees * Math.PI / 180;
            x += Math.cos(radians);
            y += Math.sin(radians);
            count++;
        }
        if (count === 0) return null;
        const mean = Math.atan2(y / count, x / count) * 180 / Math.PI;
        return mean < 0 ? mean + 360 : mean; // Normalize to 0-360
    });

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
        timeAxis,
        selectedModels,
        selectedAggregations = [],
        aggregationColors = defaultAggregationColors,
        hideAggregationMembers = false,
        showMinMaxFill = false,
        showPercentileFill = false,
        modelLineOpacity = 'auto',
        variable,
        unitSystem,
        isChartLocked,
        location,
    } = props;

    // Handle empty data
    if (!timeAxis || timeAxis.timestamps.length === 0 || data.size === 0) {
        return null;
    }

    // Get variable configuration
    const variableConfig = getVariableConfig(variable);

    // Use chart type override if provided, otherwise use default from config
    const chartType = (settings?.chartTypeOverride ?? variableConfig.chartType) as ChartType;
    const timePoints = timeAxis.timestamps.length;

    const seriesData = extractSeries(data, selectedModels, variable, timeAxis, unitSystem, variableConfig.convertToImperial);
    const allSeriesValues = Array.from(seriesData.values());
    const multipleModels = seriesData.size > 1;

    // Determine if we have aggregations enabled
    const hasAggregations = selectedAggregations.length > 0 && multipleModels;
    const showMinMax = multipleModels && showMinMaxFill && selectedAggregations.includes('min') && selectedAggregations.includes('max');
    const showPercentiles = multipleModels && showPercentileFill && selectedAggregations.includes('p25') && selectedAggregations.includes('p75');
    const showBoxWhisker = chartType === 'boxwhisker' && multipleModels;

    // Every statistic this chart draws, computed in one pass
    const wantedStatistics = new Set<AggregationType>();
    if (hasAggregations) selectedAggregations.forEach((a) => wantedStatistics.add(a));
    if (showMinMax) ['min', 'max'].forEach((a) => wantedStatistics.add(a as AggregationType));
    if (showPercentiles) ['p25', 'p75'].forEach((a) => wantedStatistics.add(a as AggregationType));
    if (showBoxWhisker) ['min', 'p25', 'median', 'p75', 'max'].forEach((a) => wantedStatistics.add(a as AggregationType));
    const statistics = computeStatistics(allSeriesValues, timePoints, wantedStatistics);

    // Build model series (with reduced opacity if aggregations enabled, or hidden if hideAggregationMembers)
    const modelSeries = buildSeriesConfigs(seriesData, selectedModels, chartType, hasAggregations, hideAggregationMembers, modelLineOpacity);
    const aggregationSeries = hasAggregations
        ? buildAggregationSeries(statistics, selectedAggregations, aggregationColors, chartType)
        : [];
    const bandSeries = buildBandSeries(statistics, showMinMax, showPercentiles, aggregationColors);

    // Build box & whisker series if chart type is boxwhisker
    const boxWhiskerSeriesList: SeriesConfig[] = [];
    if (showBoxWhisker) {
        const boxWhiskerData: BoxWhiskerData = {
            min: statistics.get('min')!,
            q1: statistics.get('p25')!,
            median: statistics.get('median')!,
            q3: statistics.get('p75')!,
            max: statistics.get('max')!,
        };
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
        const heatmapData = buildHeatmapData(seriesData, timeAxis);
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

    // Add accumulation series if enabled and variable supports it
    if (settings?.showAccumulation && supportsAccumulation(variable as any)) {
        const accSeries = buildAccumulationSeries(seriesData, selectedModels);
        if (accSeries.length > 0) {
            allSeries.push(...accSeries);
            hasAccumulation = true;
        }
    }

    // Add multi-level overlay series if enabled (e.g., wind at different altitudes)
    if (settings?.showOverlays && hasOverlays(variable as any) && chartType !== 'heatmap' && chartType !== 'boxwhisker') {
        const overlaySeries = buildOverlaySeries(data, selectedModels, variable, timeAxis, unitSystem, chartType);
        if (overlaySeries.length > 0) {
            allSeries.push(...overlaySeries);
        }
    }

    // Add wind direction arrows for wind speed charts
    if (variable === 'wind_speed_10m' && chartType !== 'heatmap' && chartType !== 'boxwhisker') {
        const windArrowData = buildWindArrowData(data, selectedModels, timeAxis);
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

    const isHeatmap = chartType === 'heatmap';

    // For heatmaps, use dates as x-axis labels; otherwise use time labels
    const xAxisData = isHeatmap && heatmapSeriesList[0]?.heatmapData
        ? heatmapSeriesList[0].heatmapData.dates
        : timeAxis.labels;

    // For heatmaps, adjust grid to accommodate hour labels on left
    const gridConfig = isHeatmap
        ? { top: 10, right: 10, bottom: 1, left: 50, containLabel: false }
        : { top: 10, right: 0, bottom: 1, left: 0, containLabel: true };

    // Build elevation lines config for the freezing level and snowfall height charts
    const M_TO_FT = 3.28084;
    const showsElevationLines = variable === 'freezing_level_height' || variable === 'snowfall_height';
    const elevationLines = showsElevationLines && location ? {
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
            // Non-heatmap charts tick on local clock hours, with dates at midnight
            midnightIndices: isHeatmap ? undefined : timeAxis.midnightIndices,
            hours: isHeatmap ? undefined : timeAxis.hours,
            // Full date+time labels for tooltip display (non-heatmap only)
            tooltipLabels: isHeatmap ? undefined : timeAxis.tooltipLabels,
        },
        yAxis: {
            type: 'value',
            label: isHeatmap ? 'Hour of Day' : `${variableConfig.label} (${unit})`,
            domain: isHeatmap ? [0, 23] : variableConfig.yAxisDomain,
            formatter: (value: number) => isHeatmap ? `${Math.round(value)}:00` : `${Math.round(value)}`,
        },
        yAxisSecondary,
        series: allSeries,
        grid: gridConfig,
        dataZoom: {
            enabled: !isChartLocked && !isHeatmap, // Disable zoom for heatmaps
            type: 'both',
            range: [0, 100],
        },
        theme: chartTheme,
        height: settings?.customHeight ?? 300,
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

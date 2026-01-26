import { useMemo, useState, useCallback, memo } from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Brush,
} from 'recharts';
import type { WeatherChartProps } from '../../types/detailView';
import type { HourlyDataPoint } from '../../types/openMeteo';
import { getModelConfig, getVariableConfig } from '../../utils/chartConfigurations';

interface ChartDataPoint {
    time: string;
    timestamp: number;
    [key: string]: number | string;
}

function WeatherChartInner({
    data,
    selectedModels,
    variable,
    unitSystem,
}: WeatherChartProps): JSX.Element {
    const variableConfig = useMemo(() => getVariableConfig(variable), [variable]);
    const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({});

    // Transform data for recharts format
    const chartData = useMemo((): ChartDataPoint[] => {
        if (!data || data.size === 0) return [];

        // Get time points from first model
        const firstModelData = data.values().next().value as HourlyDataPoint[] | undefined;
        if (!firstModelData || firstModelData.length === 0) return [];

        return firstModelData.map((point, index) => {
            const dataPoint: ChartDataPoint = {
                time: point.time.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                }),
                timestamp: point.timestamp,
            };

            // Add value for each model
            for (const model of selectedModels) {
                const modelData = data.get(model);
                if (modelData && modelData[index]) {
                    let value = modelData[index][variable];
                    if (typeof value === 'number') {
                        // Convert to imperial if needed
                        if (unitSystem === 'imperial' && variableConfig.convertToImperial) {
                            value = variableConfig.convertToImperial(value);
                        }
                        dataPoint[model] = value;
                    }
                }
            }

            return dataPoint;
        });
    }, [data, selectedModels, variable, unitSystem, variableConfig]);

    // Get unit based on system
    const unit = unitSystem === 'imperial' ? variableConfig.unitImperial : variableConfig.unit;

    // Memoize model line/bar/area elements
    const modelLines = useMemo(() => {
        return selectedModels.map((modelId) => {
            const modelConfig = getModelConfig(modelId);
            return (
                <Line
                    key={modelId}
                    type="monotone"
                    dataKey={modelId}
                    name={modelConfig.name}
                    stroke={modelConfig.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2, fill: 'var(--cardBg)' }}
                    isAnimationActive={false}
                />
            );
        });
    }, [selectedModels]);

    const modelBars = useMemo(() => {
        return selectedModels.map((modelId) => {
            const modelConfig = getModelConfig(modelId);
            return (
                <Bar
                    key={modelId}
                    dataKey={modelId}
                    name={modelConfig.name}
                    fill={modelConfig.color}
                    opacity={0.8}
                    isAnimationActive={false}
                />
            );
        });
    }, [selectedModels]);

    const modelAreas = useMemo(() => {
        return selectedModels.map((modelId) => {
            const modelConfig = getModelConfig(modelId);
            return (
                <Area
                    key={modelId}
                    type="monotone"
                    dataKey={modelId}
                    name={modelConfig.name}
                    stroke={modelConfig.color}
                    fill={modelConfig.color}
                    fillOpacity={0.3}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2, fill: 'var(--cardBg)' }}
                    isAnimationActive={false}
                />
            );
        });
    }, [selectedModels]);

    if (chartData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-theme-textSecondary">
                No data available
            </div>
        );
    }

    // Memoize chart margin to prevent object recreation
    const chartMargin = useMemo(() => ({ top: 10, right: 30, left: 10, bottom: 0 }), []);

    // Memoize axis tick interval
    const xAxisInterval = useMemo(() => Math.floor(chartData.length / 14), [chartData.length]);

    // Memoize Y-axis domain
    const yAxisDomain = useMemo(() => variableConfig.yAxisDomain || ['auto', 'auto'], [variableConfig.yAxisDomain]);

    // Memoize tick formatter
    const tickFormatter = useCallback((value: number) => `${Math.round(value)}`, []);

    // Memoize brush change handler
    const handleBrushChange = useCallback((range: { startIndex?: number; endIndex?: number }) => {
        setBrushRange(range);
    }, []);

    // Render appropriate chart type
    const renderChart = () => {
        switch (variableConfig.chartType) {
            case 'bar':
                return (
                    <BarChart {...commonProps}>
                        <CartesianGrid {...gridProps} />
                        <XAxis {...xAxisProps} />
                        <YAxis {...yAxisProps} />
                        <Tooltip {...tooltipProps} />
                        <Legend {...legendProps} />
                        {renderModelBars()}
                        <Brush {...brushProps} />
                    </BarChart>
                );
            case 'area':
                return (
                    <AreaChart {...commonProps}>
                        <CartesianGrid {...gridProps} />
                        <XAxis {...xAxisProps} />
                        <YAxis {...yAxisProps} />
                        <Tooltip {...tooltipProps} />
                        <Legend {...legendProps} />
                        {renderModelAreas()}
                        <Brush {...brushProps} />
                    </AreaChart>
                );
            default:
                return (
                    <LineChart {...commonProps}>
                        <CartesianGrid {...gridProps} />
                        <XAxis {...xAxisProps} />
                        <YAxis {...yAxisProps} />
                        <Tooltip {...tooltipProps} />
                        <Legend {...legendProps} />
                        {renderModelLines()}
                        <Brush {...brushProps} />
                    </LineChart>
                );
        }
    };

    return (
        <div className="w-full">
            <div className="flex items-center gap-2 mb-2">
                <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: variableConfig.color }}
                />
                <h3 className="text-lg font-semibold text-theme-textPrimary">
                    {variableConfig.label}
                </h3>
                <span className="text-sm text-theme-textSecondary">
                    ({unit})
                </span>
            </div>
            <ResponsiveContainer width="100%" height={380}>
                {renderChart()}
            </ResponsiveContainer>
        </div>
    );
}

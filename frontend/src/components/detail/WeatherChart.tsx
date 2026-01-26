import { useMemo, useState } from 'react';
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

export function WeatherChart({
    data,
    selectedModels,
    variable,
    unitSystem,
}: WeatherChartProps): JSX.Element {
    const variableConfig = getVariableConfig(variable);

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

    // Render lines for each model
    const renderModelLines = () => {
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
                    dot={{ r: 4, strokeWidth: 2, fill: 'var(--color-cardBg)' }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                />
            );
        });
    };

    const renderModelBars = () => {
        return selectedModels.map((modelId) => {
            const modelConfig = getModelConfig(modelId);
            return (
                <Bar
                    key={modelId}
                    dataKey={modelId}
                    name={modelConfig.name}
                    fill={modelConfig.color}
                    opacity={0.8}
                />
            );
        });
    };

    const renderModelAreas = () => {
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
                />
            );
        });
    };

    if (chartData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-theme-textSecondary">
                No data available
            </div>
        );
    }

    // Common chart props
    const commonProps = {
        data: chartData,
        margin: { top: 10, right: 30, left: 10, bottom: 0 },
    };

    const xAxisProps = {
        dataKey: 'time',
        tick: { fontSize: 11, fill: 'var(--color-textSecondary)' },
        tickLine: { stroke: 'var(--color-border)' },
        axisLine: { stroke: 'var(--color-border)' },
        interval: Math.floor(chartData.length / 14), // Show ~14 ticks
    };

    const yAxisProps = {
        tick: { fontSize: 11, fill: 'var(--color-textSecondary)' },
        tickLine: { stroke: 'var(--color-border)' },
        axisLine: { stroke: 'var(--color-border)' },
        domain: variableConfig.yAxisDomain || ['auto', 'auto'],
        tickFormatter: (value: number) => `${Math.round(value)}`,
    };

    const tooltipProps = {
        contentStyle: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ccc',
            borderRadius: '6px',
            fontSize: '13px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            color: '#000',
        },
        itemStyle: { padding: 0 },
        labelStyle: { color: '#000', fontWeight: 600, marginBottom: '4px' },
        cursor: { stroke: '#666', strokeWidth: 1, strokeDasharray: '3 3' },
    };

    const legendProps = {
        wrapperStyle: { fontSize: '12px' },
    };

    const gridProps = {
        strokeDasharray: '0',
        stroke: 'var(--color-border)',
        opacity: 0.8,
    };

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
            <ResponsiveContainer width="100%" height={300}>
                {renderChart()}
            </ResponsiveContainer>
        </div>
    );
}

/**
 * uPlot Data Builder
 *
 * Transforms ChartConfig series data into uPlot's columnar AlignedData format.
 */

import type { ChartConfig } from '../../types';

/**
 * uPlot's data format: [xValues, ...ySeriesValues]
 * where each array has the same length.
 */
export type UPlotData = [number[], ...(number | null)[][]];

/**
 * Transform ChartConfig to uPlot's columnar data format.
 *
 * uPlot expects:
 * - First array: x-values (numeric, ascending)
 * - Subsequent arrays: y-values for each series
 *
 * For category x-axis (like time labels), we use numeric indices
 * and map to labels via axis formatter.
 */
export function buildUPlotData(config: ChartConfig): UPlotData {
    const dataLength = config.xAxis.data?.length ?? 0;

    if (dataLength === 0 || config.series.length === 0) {
        // Return minimal valid data
        return [[0], [null]];
    }

    // X-axis: Use numeric indices (0, 1, 2, ...)
    // Labels are mapped via axis formatter
    const xData: number[] = [];
    for (let i = 0; i < dataLength; i++) {
        xData.push(i);
    }

    // Y-series: Extract data arrays in order
    const yData = config.series.map((s) => {
        // Ensure array length matches x-data
        const data = s.data ?? [];
        if (data.length !== dataLength) {
            // Pad or truncate to match
            const padded: (number | null)[] = [];
            for (let i = 0; i < dataLength; i++) {
                padded.push(data[i] ?? null);
            }
            return padded;
        }
        return data;
    });

    return [xData, ...yData] as UPlotData;
}

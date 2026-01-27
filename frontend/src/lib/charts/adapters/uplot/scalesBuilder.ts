/**
 * uPlot Scales Builder
 *
 * Builds scale configurations for Y-axes.
 */

import type { ChartConfig } from '../../types';
import type uPlot from 'uplot';

/**
 * Build scales configuration for uPlot.
 * Handles primary and secondary Y-axis scales with optional domain constraints.
 */
export function buildScales(config: ChartConfig): Record<string, uPlot.Scale> {
    const primaryDomain = config.yAxis.domain ?? ['auto', 'auto'];

    const scales: Record<string, uPlot.Scale> = {
        // X-axis scale (numeric indices for category data)
        x: {
            time: false, // Not a time scale, using indices
        },

        // Primary Y-axis scale
        y: {
            auto: primaryDomain[0] === 'auto' && primaryDomain[1] === 'auto',
            range: (
                _u: uPlot,
                dataMin: number,
                dataMax: number
            ): [number, number] => {
                const min =
                    primaryDomain[0] === 'auto' ? dataMin : (primaryDomain[0] as number);
                const max =
                    primaryDomain[1] === 'auto' ? dataMax : (primaryDomain[1] as number);

                // Add padding
                const range = max - min || 1;
                const padding = range * 0.05;

                return [
                    primaryDomain[0] === 'auto' ? min - padding : min,
                    primaryDomain[1] === 'auto' ? max + padding : max,
                ];
            },
        },
    };

    // Add secondary Y-axis scale if defined
    if (config.yAxisSecondary) {
        const secondaryDomain = config.yAxisSecondary.domain ?? ['auto', 'auto'];

        scales.y2 = {
            auto: secondaryDomain[0] === 'auto' && secondaryDomain[1] === 'auto',
            range: (
                _u: uPlot,
                dataMin: number,
                dataMax: number
            ): [number, number] => {
                const min =
                    secondaryDomain[0] === 'auto'
                        ? dataMin
                        : (secondaryDomain[0] as number);
                const max =
                    secondaryDomain[1] === 'auto'
                        ? dataMax
                        : (secondaryDomain[1] as number);

                // Add padding
                const range = max - min || 1;
                const padding = range * 0.05;

                return [
                    secondaryDomain[0] === 'auto' ? min - padding : min,
                    secondaryDomain[1] === 'auto' ? max + padding : max,
                ];
            },
        };
    }

    return scales;
}

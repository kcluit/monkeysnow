/**
 * uPlot Scales Builder
 *
 * Builds scale configurations for Y-axes with smart minimum range handling.
 */

import type { ChartConfig } from '../../types';
import type uPlot from 'uplot';

/** Default minimum range for flat data to ensure visible scale */
const DEFAULT_MIN_RANGE = 5;

/**
 * Calculate smart Y-axis range with minimum spread for flat data.
 * Prevents invisible scales when all values are the same (e.g., all zeros for snowfall).
 */
function getSmartRange(
    dataMin: number,
    dataMax: number,
    domain: [number | 'auto', number | 'auto'],
    minRange: number = DEFAULT_MIN_RANGE
): [number, number] {
    // Apply domain constraints
    let min = domain[0] === 'auto' ? dataMin : (domain[0] as number);
    let max = domain[1] === 'auto' ? dataMax : (domain[1] as number);

    const range = max - min;

    // Handle flat data (range is very small or zero)
    // This commonly happens with snowfall when all values are 0
    if (range < minRange) {
        const center = (min + max) / 2;

        // If domain has a fixed minimum (like 0 for snowfall), respect it
        if (domain[0] !== 'auto') {
            // Fixed min, expand max only
            max = min + minRange;
        } else if (domain[1] !== 'auto') {
            // Fixed max, expand min only
            min = max - minRange;
        } else {
            // Both auto, expand symmetrically from center
            min = center - minRange / 2;
            max = center + minRange / 2;
        }
    }

    // Add padding (5% of range or minimum range, whichever is used)
    const effectiveRange = max - min;
    const padding = effectiveRange * 0.05;

    return [
        domain[0] === 'auto' ? min - padding : min,
        domain[1] === 'auto' ? max + padding : max,
    ];
}

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

        // Primary Y-axis scale with smart minimum range
        y: {
            auto: primaryDomain[0] === 'auto' && primaryDomain[1] === 'auto',
            range: (
                _u: uPlot,
                dataMin: number,
                dataMax: number
            ): [number, number] => {
                return getSmartRange(dataMin, dataMax, primaryDomain);
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
                return getSmartRange(dataMin, dataMax, secondaryDomain);
            },
        };
    }

    return scales;
}

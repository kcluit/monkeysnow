/**
 * uPlot Theme Adapter
 *
 * Extracts theme colors from CSS custom properties.
 * Compatible with the existing useChartTheme hook.
 */

import type { ChartTheme } from '../../types';

const DEFAULT_THEME: ChartTheme = {
    background: 'transparent',
    cardBg: '#ffffff',
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
    accent: '#3b82f6',
    border: '#e5e7eb',
    gridLine: 'rgba(107, 114, 128, 0.3)',
};

/**
 * Get a CSS custom property value with fallback.
 */
function getCSSVariable(name: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
    return value || fallback;
}

/**
 * Extract theme colors from CSS custom properties.
 * Returns a ChartTheme object for use in chart configuration.
 */
export function getUPlotTheme(): ChartTheme {
    return {
        background: 'transparent',
        cardBg: getCSSVariable('--cardBg', DEFAULT_THEME.cardBg),
        textPrimary: getCSSVariable('--textPrimary', DEFAULT_THEME.textPrimary),
        textSecondary: getCSSVariable('--textSecondary', DEFAULT_THEME.textSecondary),
        accent: getCSSVariable('--accent', DEFAULT_THEME.accent),
        border: getCSSVariable('--border', DEFAULT_THEME.border),
        gridLine: getCSSVariable('--gridLine', DEFAULT_THEME.gridLine),
    };
}

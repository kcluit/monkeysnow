/**
 * Chart Theme
 *
 * Extracts theme colors from CSS custom properties.
 */

import type { ChartTheme } from './types';

/**
 * Extract chart theme from CSS variables.
 * Falls back to light theme defaults if variables are not defined.
 */
export function getUPlotTheme(): ChartTheme {
    const root = document.documentElement;
    const style = getComputedStyle(root);

    const getVar = (name: string, fallback: string): string => {
        const value = style.getPropertyValue(name).trim();
        return value || fallback;
    };

    return {
        background: getVar('--background', '#ffffff'),
        textPrimary: getVar('--textPrimary', '#1f2937'),
        textSecondary: getVar('--textSecondary', '#6b7280'),
        gridColor: getVar('--gridLine', '#e5e7eb'),
        accent: getVar('--accent', '#3b82f6'),
        tooltipBg: getVar('--cardBg', '#ffffff'),
        tooltipBorder: getVar('--border', '#e5e7eb'),
    };
}

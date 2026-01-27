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
        background: getVar('--color-background', '#ffffff'),
        textPrimary: getVar('--color-text-primary', '#1f2937'),
        textSecondary: getVar('--color-text-secondary', '#6b7280'),
        gridColor: getVar('--color-border', '#e5e7eb'),
        accent: getVar('--color-accent', '#3b82f6'),
        tooltipBg: getVar('--color-card-background', '#ffffff'),
        tooltipBorder: getVar('--color-border', '#e5e7eb'),
    };
}

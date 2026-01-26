/**
 * ECharts Theme Adapter
 *
 * Extracts CSS custom properties and converts them to ECharts theme format.
 */

import type { ChartTheme } from '../../types';

/** Default fallback colors if CSS variables are not available */
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
 * Get a CSS variable value from the document root.
 * Returns the fallback if the variable is not found.
 */
function getCSSVariable(name: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

/**
 * Extract theme colors from CSS custom properties.
 * These variables are set by the useTheme hook based on the selected theme.
 */
export function getEChartsTheme(): ChartTheme {
  return {
    background: 'transparent', // Let parent container handle background
    cardBg: getCSSVariable('--cardBg', DEFAULT_THEME.cardBg),
    textPrimary: getCSSVariable('--textPrimary', DEFAULT_THEME.textPrimary),
    textSecondary: getCSSVariable('--textSecondary', DEFAULT_THEME.textSecondary),
    accent: getCSSVariable('--accent', DEFAULT_THEME.accent),
    border: getCSSVariable('--border', DEFAULT_THEME.border),
    gridLine: getCSSVariable('--gridLine', DEFAULT_THEME.gridLine),
  };
}

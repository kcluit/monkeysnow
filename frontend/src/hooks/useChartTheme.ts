/**
 * Chart Theme Hook
 *
 * Provides reactive theme colors for charts by observing CSS variable changes.
 * Uses debounced observation to prevent excessive re-renders.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChartTheme } from '../lib/charts';
import { getUPlotTheme } from '../lib/charts';

/**
 * Debounce delay in milliseconds.
 * Prevents excessive theme updates during rapid style changes.
 */
const DEBOUNCE_DELAY = 100;

/**
 * Hook to get chart theme and respond to theme changes.
 * Observes CSS variable changes on document root with debouncing.
 */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState(() => getUPlotTheme());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced theme update function
  const updateTheme = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setTheme(getUPlotTheme());
    }, DEBOUNCE_DELAY);
  }, []);

  useEffect(() => {
    // Observe only data-theme attribute changes for targeted updates
    const observer = new MutationObserver((mutations) => {
      // Only update if a relevant attribute changed
      const hasThemeChange = mutations.some(
        (m) =>
          m.attributeName === 'data-theme' ||
          m.attributeName === 'class' ||
          m.attributeName === 'style'
      );
      if (hasThemeChange) {
        updateTheme();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class', 'data-theme'],
    });

    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [updateTheme]);

  return theme;
}

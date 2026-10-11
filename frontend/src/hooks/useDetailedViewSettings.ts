import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_VARIABLES } from '../utils/chartConfigurations';
import type { WeatherVariable } from '../types/openMeteo';
import type { ElevationSelection } from '../types/detailView';

/**
 * The Detailed view's choices that are one for every Resort and location, kept in this browser.
 * The Detailed view, the Settings page and the command palette all change them.
 */

type Setter<T> = (value: T | ((prev: T) => T)) => void;

/** The Charts shown, in order */
export function useShownCharts(): [WeatherVariable[], Setter<WeatherVariable[]>] {
    return useLocalStorage<WeatherVariable[]>('detailSelectedVariables', DEFAULT_VARIABLES);
}

/**
 * The height a Resort is forecast at: an Elevation band, or a Custom elevation in metres.
 * Defaults to the base, so each Resort is forecast at its own base elevation.
 */
export function useDetailElevation(): [ElevationSelection, Setter<ElevationSelection>] {
    return useLocalStorage<ElevationSelection>('detailElevationSelection', 'base');
}

/** The Forecast horizon, in days: one of FORECAST_HORIZONS */
export function useForecastHorizon(): [number, Setter<number>] {
    return useLocalStorage<number>('detailForecastDays', 14);
}

/** Whether the Charts are Locked charts: no zooming, by scrolling, pinching or a range slider */
export function useLockedCharts(): [boolean, Setter<boolean>] {
    return useLocalStorage<boolean>('detailChartLocked', false);
}

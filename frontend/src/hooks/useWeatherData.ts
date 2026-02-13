import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAllData } from '../utils/weather';
import { getCompressed, setCompressed } from '../utils/compressedStorage';
import type { AllWeatherData, UseWeatherDataReturn } from '../types';

const CACHE_KEY = 'weather:all';

// Module-level cache for request deduplication (prevents duplicate fetches in React StrictMode)
let cachedData: AllWeatherData | null = null;
let pendingRequest: Promise<AllWeatherData> | null = null;

export function useWeatherData(): UseWeatherDataReturn {
    const [allWeatherData, setAllWeatherData] = useState<AllWeatherData | null>(cachedData);
    const [loading, setLoading] = useState(!cachedData);
    const [error, setError] = useState<Error | null>(null);
    const loadingController = useRef<AbortController | null>(null);

    useEffect(() => {
        let cancelled = false;
        let delayTimer: ReturnType<typeof setTimeout> | null = null;

        async function fetchFreshData(hasCachedData: boolean) {
            try {
                if (!hasCachedData) {
                    setLoading(true);
                }
                setError(null);

                // Reuse pending request if one exists (deduplication)
                if (!pendingRequest) {
                    pendingRequest = fetchAllData();
                }

                const data = await pendingRequest;
                cachedData = data;
                pendingRequest = null;

                if (!cancelled) {
                    setAllWeatherData(data);
                }

                // Write to compressed localStorage in background (non-blocking)
                setTimeout(() => {
                    try {
                        setCompressed(CACHE_KEY, data);
                    } catch (err) {
                        console.warn('Failed to cache weather data to localStorage:', err);
                    }
                }, 0);
            } catch (err) {
                pendingRequest = null;
                if (!cancelled) {
                    if (hasCachedData) {
                        // Silently keep cached data if delayed fetch fails
                        console.warn('Failed to refresh weather data, keeping cached version:', err);
                    } else {
                        console.error('Failed to fetch weather data:', err);
                        setError(err instanceof Error ? err : new Error('Unknown error'));
                    }
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        function init() {
            // If we already have module-level cached data, use it
            if (cachedData) {
                setAllWeatherData(cachedData);
                setLoading(false);
                return;
            }

            // Try to restore from compressed localStorage for instant display
            let hasCachedData = false;
            try {
                const cached = getCompressed<AllWeatherData>(CACHE_KEY);
                if (cached && !cancelled) {
                    setAllWeatherData(cached);
                    setLoading(false);
                    hasCachedData = true;
                    console.log('Weather data restored from localStorage, fetching fresh data in 5s');
                }
            } catch {
                // localStorage unavailable or corrupt — continue to network fetch
                console.warn('Failed to restore weather data from localStorage');
            }

            if (hasCachedData) {
                // Delay fresh fetch by 5 seconds when cached data is available
                delayTimer = setTimeout(() => {
                    if (!cancelled) {
                        fetchFreshData(true);
                    }
                }, 5000);
            } else {
                // No cached data — fetch immediately
                fetchFreshData(false);
            }
        }

        init();
        return () => {
            cancelled = true;
            if (delayTimer) {
                clearTimeout(delayTimer);
            }
        };
    }, []);

    const createLoadingController = useCallback((): AbortController => {
        if (loadingController.current) {
            loadingController.current.abort();
        }
        loadingController.current = new AbortController();
        return loadingController.current;
    }, []);

    const cancelLoading = useCallback((): void => {
        if (loadingController.current) {
            loadingController.current.abort();
        }
    }, []);

    return {
        allWeatherData,
        loading,
        error,
        createLoadingController,
        cancelLoading,
    };
}

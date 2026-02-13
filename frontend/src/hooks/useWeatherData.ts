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

        async function init() {
            // If we already have module-level cached data, use it
            if (cachedData) {
                setAllWeatherData(cachedData);
                setLoading(false);
                return;
            }

            // Try to restore from compressed localStorage for instant display while fetch happens
            try {
                const cached = getCompressed<AllWeatherData>(CACHE_KEY);
                if (cached && !cancelled) {
                    setAllWeatherData(cached);
                    console.log('Weather data restored from localStorage');
                }
            } catch {
                // localStorage unavailable or corrupt — continue to network fetch
                console.warn('Failed to restore weather data from localStorage');
            }

            // Always fetch fresh data
            try {
                setLoading(true);
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
                    console.error('Failed to fetch weather data:', err);
                    setError(err instanceof Error ? err : new Error('Unknown error'));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        init();
        return () => { cancelled = true; };
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

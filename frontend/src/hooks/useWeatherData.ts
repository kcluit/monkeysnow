import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAllData } from '../utils/weather';
import type { AllWeatherData, UseWeatherDataReturn } from '../types';

// Module-level cache for request deduplication (prevents duplicate fetches in React StrictMode)
let cachedData: AllWeatherData | null = null;
let pendingRequest: Promise<AllWeatherData> | null = null;

export function useWeatherData(): UseWeatherDataReturn {
  const [allWeatherData, setAllWeatherData] = useState<AllWeatherData | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState<Error | null>(null);
  const loadingController = useRef<AbortController | null>(null);

  useEffect(() => {
    // If we already have cached data, skip fetch
    if (cachedData) {
      setAllWeatherData(cachedData);
      setLoading(false);
      return;
    }

    const loadWeatherData = async () => {
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
        setAllWeatherData(data);
      } catch (err) {
        pendingRequest = null;
        console.error('Failed to fetch weather data:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadWeatherData();
  }, []);

  const createLoadingController = useCallback((): AbortController => {
    // Cancel any existing loading
    if (loadingController.current) {
      loadingController.current.abort();
    }
    // Create new loading controller
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
    cancelLoading
  };
}

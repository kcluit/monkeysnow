import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAllData } from '../utils/weather';
import type { AllWeatherData, UseWeatherDataReturn } from '../types';

export function useWeatherData(): UseWeatherDataReturn {
  const [allWeatherData, setAllWeatherData] = useState<AllWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const loadingController = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadWeatherData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAllData();
        setAllWeatherData(data);
      } catch (err) {
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

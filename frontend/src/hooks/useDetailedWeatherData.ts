import { useState, useEffect, useRef } from 'react';
import { fetchOpenMeteoData } from '../utils/openMeteoClient';
import type { WeatherModel, WeatherVariable, HourlyDataPoint } from '../types/openMeteo';

export interface UseDetailedWeatherDataProps {
  latitude: number;
  longitude: number;
  elevation: number;
  models: WeatherModel[];
  variables: WeatherVariable[];
  forecastDays?: number;
  enabled?: boolean;
}

export interface UseDetailedWeatherDataReturn {
  data: Map<WeatherModel, HourlyDataPoint[]> | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDetailedWeatherData({
  latitude,
  longitude,
  elevation,
  models,
  variables,
  forecastDays = 14,
  enabled = true,
}: UseDetailedWeatherDataProps): UseDetailedWeatherDataReturn {
  const [data, setData] = useState<Map<WeatherModel, HourlyDataPoint[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Track the previous params to detect changes
  const prevParamsRef = useRef<string>('');

  // Create a stable key from the parameters
  const paramsKey = JSON.stringify({
    latitude,
    longitude,
    elevation,
    models: [...models].sort(),
    variables: [...variables].sort(),
    forecastDays,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (models.length === 0 || variables.length === 0) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Skip if params haven't changed and this isn't a refetch
    const isRefetch = refetchTrigger > 0;
    if (paramsKey === prevParamsRef.current && !isRefetch) {
      return;
    }
    prevParamsRef.current = paramsKey;

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchOpenMeteoData(
          latitude,
          longitude,
          elevation,
          models,
          variables,
          forecastDays
        );

        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch weather data'));
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [paramsKey, enabled, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return {
    data,
    loading,
    error,
    refetch,
  };
}

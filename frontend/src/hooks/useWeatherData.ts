import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAllData } from '../utils/weather';
import { idbGet, idbSet } from '../utils/indexedDB';
import type { AllWeatherData, ResortData, UseWeatherDataReturn } from '../types';

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

      // Try to restore from IndexedDB for instant display while fetch happens
      try {
        const raw = localStorage.getItem('selectedResorts');
        if (raw) {
          const selectedResorts: string[] = JSON.parse(raw);
          if (selectedResorts.length > 0) {
            const cachedUpdatedAt = await idbGet<string>('meta:updatedAt');
            const data: Record<string, ResortData> = {};

            await Promise.all(
              selectedResorts.map(async (name) => {
                try {
                  const entry = await idbGet<ResortData>(`resort:${name}`);
                  if (entry) data[name] = entry;
                } catch {
                  // Individual read failed — skip
                }
              })
            );

            if (!cancelled && Object.keys(data).length > 0) {
              setAllWeatherData({ updatedAt: cachedUpdatedAt || '', data });
            }
          }
        }
      } catch {
        // IndexedDB unavailable — continue to network fetch
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

        // Write to IndexedDB in background (non-blocking)
        (async () => {
          try {
            await idbSet('meta:updatedAt', data.updatedAt);
            await Promise.all(
              Object.entries(data.data).map(([name, resortData]) =>
                idbSet(`resort:${name}`, resortData)
              )
            );
          } catch {
            // IndexedDB unavailable — silently ignore
          }
        })();
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

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchSelectedResorts } from '../utils/weather';
import { idbGet, idbSet } from '../utils/indexedDB';
import type { AllWeatherData, ResortData, UseWeatherDataReturn } from '../types';

export function useWeatherData(): UseWeatherDataReturn {
  const [allWeatherData, setAllWeatherData] = useState<AllWeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const loadingController = useRef<AbortController | null>(null);

  // On mount: restore cached resort data from IndexedDB for selected resorts
  useEffect(() => {
    let cancelled = false;

    async function restoreCache() {
      try {
        // Read selectedResorts directly from localStorage to avoid prop dependency
        const raw = localStorage.getItem('selectedResorts');
        if (!raw) return;
        const selectedResorts: string[] = JSON.parse(raw);
        if (!selectedResorts.length) return;

        const cachedUpdatedAt = await idbGet<string>('meta:updatedAt');
        const data: Record<string, ResortData> = {};

        await Promise.all(
          selectedResorts.map(async (name) => {
            const entry = await idbGet<ResortData>(`resort:${name}`);
            if (entry) data[name] = entry;
          })
        );

        if (cancelled) return;

        // Only set state if we got at least some cached data
        if (Object.keys(data).length > 0) {
          setAllWeatherData({ updatedAt: cachedUpdatedAt || '', data });
          setUpdatedAt(cachedUpdatedAt || null);
        }
      } catch {
        // IndexedDB unavailable (incognito, etc.) — silently ignore
      }
    }

    restoreCache();
    return () => { cancelled = true; };
  }, []);

  const fetchResorts = useCallback(async (resortNames: string[]) => {
    if (resortNames.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const freshData = await fetchSelectedResorts(resortNames);

      // Merge fresh data into existing state
      setAllWeatherData((prev) => {
        const merged = { ...prev?.data, ...freshData.data };
        return { updatedAt: freshData.updatedAt, data: merged };
      });
      setUpdatedAt(freshData.updatedAt);

      // Write to IndexedDB in background (non-blocking)
      (async () => {
        try {
          await idbSet('meta:updatedAt', freshData.updatedAt);
          await Promise.all(
            Object.entries(freshData.data).map(([name, resortData]) =>
              idbSet(`resort:${name}`, resortData)
            )
          );
        } catch {
          // IndexedDB unavailable — silently ignore
        }
      })();
    } catch (err) {
      console.error('Failed to fetch resorts:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
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
    updatedAt,
    fetchResorts,
    createLoadingController,
    cancelLoading,
  };
}

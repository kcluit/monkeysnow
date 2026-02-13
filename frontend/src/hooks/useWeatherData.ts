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
  const sessionCache = useRef<Map<string, ResortData>>(new Map());

  // On mount: restore cached resort data from IndexedDB and populate session cache
  useEffect(() => {
    let cancelled = false;

    async function restoreCache() {
      try {
        const raw = localStorage.getItem('selectedResorts');
        if (!raw) return;
        const selectedResorts: string[] = JSON.parse(raw);
        if (!selectedResorts.length) return;

        const cachedUpdatedAt = await idbGet<string>('meta:updatedAt');
        const data: Record<string, ResortData> = {};

        await Promise.all(
          selectedResorts.map(async (name) => {
            const entry = await idbGet<ResortData>(`resort:${name}`);
            if (entry) {
              data[name] = entry;
              sessionCache.current.set(name, entry);
            }
          })
        );

        if (cancelled) return;

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
      setError(null);

      // Phase 1: Check session cache, then IndexedDB for misses
      const cachedData: Record<string, ResortData> = {};
      const missingFromSession: string[] = [];

      for (const name of resortNames) {
        const cached = sessionCache.current.get(name);
        if (cached) {
          cachedData[name] = cached;
        } else {
          missingFromSession.push(name);
        }
      }

      if (missingFromSession.length > 0) {
        await Promise.all(
          missingFromSession.map(async (name) => {
            try {
              const entry = await idbGet<ResortData>(`resort:${name}`);
              if (entry) {
                cachedData[name] = entry;
                sessionCache.current.set(name, entry);
              }
            } catch {
              // IndexedDB read failed — skip this resort
            }
          })
        );
      }

      // Phase 2: Display cached data immediately
      if (Object.keys(cachedData).length > 0) {
        setAllWeatherData((prev) => {
          const merged = { ...prev?.data, ...cachedData };
          return { updatedAt: prev?.updatedAt || '', data: merged };
        });
      }

      // Phase 3: Always fetch fresh data in background (stale-while-revalidate)
      setLoading(true);

      const freshData = await fetchSelectedResorts(resortNames);

      // Update session cache with fresh data
      for (const [name, resortData] of Object.entries(freshData.data)) {
        sessionCache.current.set(name, resortData);
      }

      // Merge fresh data into state
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

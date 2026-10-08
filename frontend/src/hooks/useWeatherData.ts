import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fetchResortForecasts, groupIntoRequests, resortCallWeight } from '../utils/resortForecast';
import { idbGet, idbSet } from '../utils/indexedDB';
import type { AllWeatherData, ResortData, UseWeatherDataReturn } from '../types';

/** How long a fetched forecast is trusted before it is refetched in the background. */
export const FRESHNESS_WINDOW_MS = 3 * 60 * 60 * 1000;

/** How often an open tab looks for forecasts that have gone stale. */
const STALENESS_CHECK_MS = 5 * 60 * 1000;

/** Requests in flight at once; the Fetch budget decides when each may start. */
const CONCURRENT_REQUESTS = 3;

/** Attempts per request group for errors other than rate limits (those wait out the pause instead). */
const MAX_ATTEMPTS = 3;

// One queue per mount, so StrictMode's double mount can't mix up two queues
interface FetchQueue {
  pending: string[][];
  inFlight: Set<string>;
  running: number;
  syncRun: number;
  controller: AbortController;
}

const isFresh = (entry: ResortData | undefined, now: number): boolean =>
  Boolean(entry?.fetchedAt && now - entry.fetchedAt < FRESHNESS_WINDOW_MS);

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });

async function readCachedForecasts(resortIds: string[]): Promise<Record<string, ResortData>> {
  const cached: Record<string, ResortData> = {};
  try {
    await Promise.all(
      resortIds.map(async (id) => {
        const entry = await idbGet<ResortData>(`resort:${id}`);
        if (entry) cached[id] = entry;
      })
    );
  } catch {
    // IndexedDB unavailable (incognito, etc.) — silently ignore
  }
  return cached;
}

function writeCachedForecasts(forecasts: Record<string, ResortData>): void {
  Promise.all(
    Object.entries(forecasts).map(([id, data]) => idbSet(`resort:${id}`, data))
  ).catch(() => {
    // IndexedDB unavailable — silently ignore
  });
}

/**
 * Keeps forecasts for the Selection loaded: cached forecasts show immediately,
 * missing ones are fetched first, stale ones are refreshed in the background,
 * and every request waits its turn in the Fetch budget.
 */
export function useWeatherData(selectedResorts: string[]): UseWeatherDataReturn {
  const [allWeatherData, setAllWeatherData] = useState<AllWeatherData | null>(null);
  const [loading, setLoading] = useState(selectedResorts.length > 0);
  const [error, setError] = useState<Error | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [outstanding, setOutstanding] = useState<string[]>([]);

  const dataRef = useRef<Record<string, ResortData>>({});
  const queueRef = useRef<FetchQueue | null>(null);
  const selectionRef = useRef(selectedResorts);
  selectionRef.current = selectedResorts;
  const loadingController = useRef<AbortController | null>(null);

  const mergeForecasts = useCallback((forecasts: Record<string, ResortData>) => {
    if (Object.keys(forecasts).length === 0) return;
    dataRef.current = { ...dataRef.current, ...forecasts };
    const latest = Math.max(0, ...Object.values(dataRef.current).map((d) => d.fetchedAt ?? 0));
    const stamp = latest ? new Date(latest).toISOString() : '';
    setAllWeatherData({ updatedAt: stamp, data: dataRef.current });
    setUpdatedAt(stamp || null);
  }, []);

  const publishOutstanding = useCallback((queue: FetchQueue) => {
    setOutstanding([...queue.pending.flat(), ...queue.inFlight]);
    setLoading(queue.running > 0);
  }, []);

  const runWorker = useCallback(async (queue: FetchQueue) => {
    const { signal } = queue.controller;
    try {
      for (let group = queue.pending.shift(); group; group = queue.pending.shift()) {
        group.forEach((id) => queue.inFlight.add(id));
        publishOutstanding(queue);

        for (let attempt = 1; attempt <= MAX_ATTEMPTS && !signal.aborted; attempt++) {
          try {
            const fresh = await fetchResortForecasts(group, 'main', signal);
            if (signal.aborted) return;
            mergeForecasts(fresh);
            writeCachedForecasts(fresh);
            break;
          } catch (err) {
            if (signal.aborted) return;
            console.error(`Failed to fetch ${group.length} resorts (attempt ${attempt}/${MAX_ATTEMPTS}):`, err);
            if (attempt === MAX_ATTEMPTS) {
              setError(err instanceof Error ? err : new Error('Unknown error'));
            } else {
              await sleep(2000 * attempt, signal);
            }
          }
        }

        group.forEach((id) => queue.inFlight.delete(id));
        publishOutstanding(queue);
      }
    } finally {
      queue.running--;
      if (!signal.aborted) publishOutstanding(queue);
    }
  }, [mergeForecasts, publishOutstanding]);

  /** Queues every resort in the selection that has no forecast or a stale one. */
  const sync = useCallback(async (selection: string[]) => {
    const queue = queueRef.current;
    if (!queue) return;
    const run = ++queue.syncRun;

    // Another tab may have fetched these already; take anything newer from IndexedDB first
    const now = Date.now();
    const notFresh = selection.filter((id) => !isFresh(dataRef.current[id], now));
    const cached = await readCachedForecasts(notFresh);
    if (queue.controller.signal.aborted || run !== queue.syncRun) return;

    const newer: Record<string, ResortData> = {};
    for (const [id, entry] of Object.entries(cached)) {
      const current = dataRef.current[id];
      if (!current || (entry.fetchedAt ?? 0) > (current.fetchedAt ?? 0)) newer[id] = entry;
    }
    mergeForecasts(newer);

    const missing: string[] = [];
    const stale: string[] = [];
    for (const id of selection) {
      if (queue.inFlight.has(id)) continue;
      const entry = dataRef.current[id];
      if (!entry) missing.push(id);
      else if (!isFresh(entry, now)) stale.push(id);
    }

    // Never-loaded resorts first, so empty slots fill before cached cards refresh
    queue.pending = [...groupIntoRequests(missing), ...groupIntoRequests(stale)];
    while (queue.running < CONCURRENT_REQUESTS && queue.running < queue.pending.length + queue.running) {
      if (queue.pending.length === 0) break;
      queue.running++;
      void runWorker(queue);
    }
    publishOutstanding(queue);
  }, [mergeForecasts, publishOutstanding, runWorker]);

  // Create this mount's queue; aborting it on unmount drops anything still waiting for budget
  useEffect(() => {
    const queue: FetchQueue = {
      pending: [],
      inFlight: new Set(),
      running: 0,
      syncRun: 0,
      controller: new AbortController(),
    };
    queueRef.current = queue;
    void sync(selectionRef.current);

    const interval = setInterval(() => void sync(selectionRef.current), STALENESS_CHECK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync(selectionRef.current);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      queue.controller.abort();
      if (queueRef.current === queue) queueRef.current = null;
    };
  }, [sync]);

  // Re-queue whenever the selection changes
  const isFirstSelection = useRef(true);
  useEffect(() => {
    if (isFirstSelection.current) {
      isFirstSelection.current = false; // the mount effect already synced it
      return;
    }
    void sync(selectedResorts);
  }, [selectedResorts, sync]);

  // Selected resorts that have no forecast yet and are waiting on the Fetch budget
  const queuedIds = useMemo(() => {
    const selected = new Set(selectedResorts);
    return outstanding.filter((id) => selected.has(id) && !allWeatherData?.data[id]);
  }, [outstanding, selectedResorts, allWeatherData]);

  const queuedCalls = useMemo(
    () => queuedIds.reduce((sum, id) => sum + resortCallWeight(id), 0),
    [queuedIds]
  );

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
    queuedCount: queuedIds.length,
    queuedCalls,
    createLoadingController,
    cancelLoading,
  };
}

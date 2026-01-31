import { useState, useEffect, useRef } from 'react';
import { fetchOpenMeteoData } from '../utils/openMeteoClient';
import type { WeatherModel, WeatherVariable, HourlyDataPoint, TimezoneInfo } from '../types/openMeteo';

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
    timezoneInfo: TimezoneInfo | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

// Retry configuration
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

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
    const [timezoneInfo, setTimezoneInfo] = useState<TimezoneInfo | null>(null);
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
        refetchTrigger // Include refetch trigger in key to force effect re-run
    });

    useEffect(() => {
        if (!enabled) {
            return;
        }

        if (models.length === 0 || variables.length === 0) {
            setData(null);
            setTimezoneInfo(null);
            setLoading(false);
            setError(null);
            return;
        }

        // Skip if params haven't changed
        if (paramsKey === prevParamsRef.current) {
            return;
        }
        prevParamsRef.current = paramsKey;

        let cancelled = false;
        let timezoneSet = false; // Track if timezone has been captured

        // Initialize with empty map
        setData(new Map());
        setTimezoneInfo(null); // Reset timezone on new fetch
        setLoading(true);
        setError(null);

        async function fetchModelWithRetry(model: WeatherModel) {
            let retryDelay = INITIAL_RETRY_DELAY_MS;

            while (!cancelled) {
                try {
                    const result = await fetchOpenMeteoData(
                        latitude,
                        longitude,
                        elevation,
                        [model], // Fetch just this model
                        variables,
                        forecastDays
                    );

                    if (!cancelled) {
                        // Store timezone from first successful response (any model)
                        if (!timezoneSet && result.timezoneInfo) {
                            timezoneSet = true;
                            setTimezoneInfo(result.timezoneInfo);
                        }

                        setData(prevData => {
                            const newData = new Map(prevData || []);
                            const modelData = result.data.get(model);
                            if (modelData) {
                                newData.set(model, modelData);
                            }
                            return newData;
                        });
                    }
                    // Success - exit the retry loop
                    return;
                } catch (err) {
                    if (cancelled) return;

                    console.error(`Failed to fetch model ${model}, retrying in ${retryDelay}ms...`, err);

                    // Wait before retrying with exponential backoff
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
                }
            }
        }

        async function fetchAll() {
            // Create an array of promises for parallel fetching with retry
            const promises = models.map((model) => fetchModelWithRetry(model));

            // Wait for all to settle (finish)
            await Promise.allSettled(promises);

            if (!cancelled) {
                setLoading(false);
            }
        }

        fetchAll();

        return () => {
            cancelled = true;
            // Reset prevParamsRef so re-mount triggers fresh fetch (fixes React StrictMode double-invoke)
            prevParamsRef.current = '';
        };
    }, [paramsKey, enabled, latitude, longitude, elevation, models, variables, forecastDays]);

    const refetch = () => {
        setRefetchTrigger(prev => prev + 1);
    };

    return {
        data,
        timezoneInfo,
        loading,
        error,
        refetch,
    };
}

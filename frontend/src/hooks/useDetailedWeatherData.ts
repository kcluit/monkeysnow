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

        // Initialize with empty map or keep existing if only adding models?
        // For simplicity, we restart fetching.
        setData(new Map());
        setLoading(true);
        setError(null);

        async function fetchModel(model: WeatherModel) {
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
                    setData(prevData => {
                        const newData = new Map(prevData || []);
                        const modelData = result.get(model);
                        if (modelData) {
                            newData.set(model, modelData);
                        }
                        return newData;
                    });
                }
            } catch (err) {
                console.error(`Failed to fetch model ${model}`, err);
                // We don't set global error here to allow other models to succeed
                // Optionally could track per-model errors
            }
        }

        async function fetchAll() {
            // Create an array of promises
            const promises = models.map(model => fetchModel(model));

            // Wait for all to settle (finish)
            await Promise.allSettled(promises);

            if (!cancelled) {
                setLoading(false);
            }
        }

        fetchAll();

        return () => {
            cancelled = true;
        };
    }, [paramsKey, enabled, latitude, longitude, elevation, models, variables, forecastDays]);

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

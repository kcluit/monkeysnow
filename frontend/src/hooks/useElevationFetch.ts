import { useState, useCallback, useRef } from 'react';

const ELEVATION_API_URL = 'https://api.open-meteo.com/v1/elevation';

interface ElevationResponse {
    latitude: number;
    longitude: number;
    elevation: number[];
}

export interface UseElevationFetchReturn {
    fetchElevation: (lat: number, lon: number) => Promise<number>;
    isLoading: boolean;
    error: Error | null;
}

export function useElevationFetch(): UseElevationFetchReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchElevation = useCallback(async (lat: number, lon: number): Promise<number> => {
        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setIsLoading(true);
        setError(null);

        try {
            const url = `${ELEVATION_API_URL}?latitude=${lat}&longitude=${lon}`;
            const response = await fetch(url, { signal: abortController.signal });

            if (!response.ok) {
                throw new Error(`Elevation API error: ${response.status}`);
            }

            const data: ElevationResponse = await response.json();

            if (!data.elevation || data.elevation.length === 0) {
                throw new Error('No elevation data returned');
            }

            const elevation = Math.round(data.elevation[0]);
            setIsLoading(false);
            return elevation;
        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                // Request was cancelled, reset loading state
                setIsLoading(false);
                throw err;
            }
            const error = err instanceof Error ? err : new Error('Failed to fetch elevation');
            setError(error);
            setIsLoading(false);
            throw error;
        }
    }, []);

    return {
        fetchElevation,
        isLoading,
        error,
    };
}

import { useState, useEffect, useRef } from 'react';
import { fetchOpenMeteoData } from '../utils/openMeteoClient';
import { isTransientError } from '../utils/openMeteoBudget';
import type { WeatherModel, WeatherVariable, HourlyDataPoint, TimezoneInfo } from '../types/openMeteo';

export interface UseDetailedWeatherDataProps {
    latitude: number;
    longitude: number;
    /** Height to forecast for; left out to forecast a Custom location at its Ground elevation */
    elevation?: number;
    models: WeatherModel[];
    variables: WeatherVariable[];
    forecastDays: number;
}

export interface UseDetailedWeatherDataReturn {
    /** Hourly forecasts by model; can include models that are no longer asked for */
    data: ReadonlyMap<WeatherModel, HourlyDataPoint[]>;
    /** Models Open-Meteo refused for this point, e.g. "No data is available for this location" */
    unavailableModels: ReadonlySet<WeatherModel>;
    /** Models still being fetched, including any waiting on the Fetch budget */
    loadingModels: ReadonlySet<WeatherModel>;
    timezoneInfo: TimezoneInfo | null;
    /** The elevation Open-Meteo forecast for, known once the first model has arrived */
    elevation: number | null;
}

// Retry configuration
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

interface ModelRequest {
    variables: ReadonlySet<WeatherVariable>;
    controller: AbortController;
}

/** The forecasts for one point, elevation and length; changing any of them starts a new session. */
interface Session {
    key: string;
    /** Variables already in the data for each model */
    fetched: Map<WeatherModel, ReadonlySet<WeatherVariable>>;
    inFlight: Map<WeatherModel, ModelRequest>;
    unavailable: Set<WeatherModel>;
}

interface ForecastState {
    /** The Session this state was fetched for */
    key: string;
    data: ReadonlyMap<WeatherModel, HourlyDataPoint[]>;
    unavailable: ReadonlySet<WeatherModel>;
    loading: ReadonlySet<WeatherModel>;
    timezoneInfo: TimezoneInfo | null;
    elevation: number | null;
}

const covers = (have: ReadonlySet<WeatherVariable> | undefined, want: WeatherVariable[]): boolean =>
    have !== undefined && want.every((variable) => have.has(variable));

function without<T>(set: ReadonlySet<T>, item: T): ReadonlySet<T> {
    const next = new Set(set);
    next.delete(item);
    return next;
}

const sleep = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms);
        signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
    });

function abortSession(session: Session): void {
    session.inFlight.forEach((request) => request.controller.abort());
    session.inFlight.clear();
}

/**
 * Keeps the detail view's forecasts loaded, one request per Forecast model.
 * Changing the point, elevation or forecast length starts over. Editing the models
 * or variables fetches only what's missing, so charts already drawn stay on screen,
 * and removing or reordering them costs no requests.
 */
export function useDetailedWeatherData({
    latitude,
    longitude,
    elevation,
    models,
    variables,
    forecastDays,
}: UseDetailedWeatherDataProps): UseDetailedWeatherDataReturn {
    const forecastKey = JSON.stringify([latitude, longitude, elevation ?? null, forecastDays]);
    // Sorted, so reordering models or variables changes nothing
    const modelsKey = [...models].sort().join(',');
    const variablesKey = [...variables].sort().join(',');

    const [state, setState] = useState<ForecastState>(() => ({
        key: forecastKey,
        data: new Map(),
        unavailable: new Set(),
        // Loading from the first paint, so the page never flashes an empty state
        loading: new Set(variables.length > 0 ? models : []),
        timezoneInfo: null,
        elevation: null,
    }));
    const sessionRef = useRef<Session | null>(null);

    useEffect(() => {
        let session = sessionRef.current;
        if (!session || session.key !== forecastKey) {
            if (session) abortSession(session);
            session = { key: forecastKey, fetched: new Map(), inFlight: new Map(), unavailable: new Set() };
            sessionRef.current = session;
            setState({ key: forecastKey, data: new Map(), unavailable: new Set(), loading: new Set(), timezoneInfo: null, elevation: null });
        }
        const current = session;

        async function fetchModel(model: WeatherModel, request: ModelRequest) {
            const { signal } = request.controller;
            let retryDelay = INITIAL_RETRY_DELAY_MS;

            for (;;) {
                try {
                    const result = await fetchOpenMeteoData(
                        latitude,
                        longitude,
                        elevation,
                        [model], // Fetch just this model
                        [...request.variables],
                        forecastDays,
                        'auto',
                        signal
                    );
                    if (signal.aborted) return;

                    current.inFlight.delete(model);
                    current.fetched.set(model, request.variables);
                    setState((s) => ({
                        ...s,
                        // A model with no hourly data is kept as empty, so it's dropped as having no data here
                        data: new Map(s.data).set(model, result.data.get(model) ?? []),
                        loading: without(s.loading, model),
                        timezoneInfo: s.timezoneInfo ?? result.timezoneInfo,
                        elevation: s.elevation ?? result.elevation,
                    }));
                    return;
                } catch (err) {
                    if (signal.aborted) return;

                    // Bad requests (e.g. a regional model with no data here) won't succeed on retry,
                    // and each retry spends the user's Open-Meteo quota
                    if (!isTransientError(err)) {
                        console.warn(`Model ${model} unavailable:`, err instanceof Error ? err.message : err);
                        current.inFlight.delete(model);
                        current.unavailable.add(model);
                        setState((s) => ({
                            ...s,
                            unavailable: new Set(s.unavailable).add(model),
                            loading: without(s.loading, model),
                        }));
                        return;
                    }

                    console.error(`Failed to fetch model ${model}, retrying in ${retryDelay}ms...`, err);

                    // Wait before retrying with exponential backoff
                    await sleep(retryDelay, signal);
                    if (signal.aborted) return;
                    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
                }
            }
        }

        // Stop fetching models that are no longer asked for, freeing their place in the Fetch budget
        const wanted = new Set(models);
        for (const [model, request] of current.inFlight) {
            if (!wanted.has(model)) {
                request.controller.abort();
                current.inFlight.delete(model);
            }
        }

        if (variables.length > 0) {
            for (const model of models) {
                if (
                    current.unavailable.has(model) ||
                    covers(current.fetched.get(model), variables) ||
                    covers(current.inFlight.get(model)?.variables, variables)
                ) {
                    continue;
                }
                // Fetch every variable again; a model already drawn keeps its data until this arrives
                current.inFlight.get(model)?.controller.abort();
                const request: ModelRequest = { variables: new Set(variables), controller: new AbortController() };
                current.inFlight.set(model, request);
                void fetchModel(model, request);
            }
        }

        setState((s) => ({ ...s, loading: new Set(current.inFlight.keys()) }));
        // The sorted keys stand in for the models and variables arrays, so a new array with
        // the same members (a reorder, or an edit undone before closing a modal) refetches nothing
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forecastKey, modelsKey, variablesKey]);

    // Requests still waiting on the Fetch budget are dropped when the view goes away
    useEffect(() => () => {
        if (sessionRef.current) abortSession(sessionRef.current);
        sessionRef.current = null;
    }, []);

    return {
        data: state.data,
        unavailableModels: state.unavailable,
        loadingModels: state.loading,
        timezoneInfo: state.timezoneInfo,
        // Until the effect starts the new Session, the state is the last one's, whose elevation was for another point or height
        elevation: state.key === forecastKey ? state.elevation : null,
    };
}

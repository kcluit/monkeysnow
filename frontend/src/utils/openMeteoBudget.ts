/**
 * Fetch budget: how many Open-Meteo calls this tab allows itself per minute.
 *
 * Open-Meteo's free tier rate-limits each IP address (600 calls/min, 5,000/hr,
 * 10,000/day), and one HTTP request can count as many calls. Every forecast
 * request in the app goes through fetchWeatherApiWithinBudget() so a large
 * selection never bursts past the per-minute limit. When Open-Meteo rate-limits
 * us anyway (shared IP, several tabs), all fetching pauses until that window
 * resets. See docs/adr/0001-fetch-forecasts-from-the-browser.md.
 */

import { fetchWeatherApi } from 'openmeteo';

export const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

/** Calls per rolling minute; leaves headroom under Open-Meteo's 600/min. */
export const FETCH_BUDGET_PER_MINUTE = 550;

const WINDOW_MS = 60_000;

/** Detail-view requests are granted before main-page requests. */
export type FetchPriority = 'detail' | 'main';

export type RateLimitWindow = 'minute' | 'hour' | 'day';

export interface BudgetPause {
    window: RateLimitWindow;
    until: number; // epoch ms
}

interface Waiter {
    weight: number;
    priority: FetchPriority;
    resolve: () => void;
    reject: (reason: unknown) => void;
    signal?: AbortSignal;
    onAbort?: () => void;
}

const spent: { at: number; weight: number }[] = [];
const waiters: Waiter[] = [];
let pause: BudgetPause | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const pauseListeners = new Set<() => void>();

/**
 * How many API calls Open-Meteo counts a request as: one per location per model,
 * scaled up past 10 variables or 14 days.
 */
export function callWeight(params: {
    latitude: number | number[];
    models?: string | string[];
    hourly?: string[];
    forecast_days?: number;
}): number {
    const locations = Array.isArray(params.latitude) ? params.latitude.length : 1;
    const models = Array.isArray(params.models) ? Math.max(1, params.models.length) : 1;
    const variables = params.hourly?.length ?? 1;
    const days = params.forecast_days ?? 7;
    return locations * models * Math.max(1, variables / 10) * Math.max(1, days / 14);
}

function spentInWindow(now: number): number {
    while (spent.length > 0 && spent[0].at <= now - WINDOW_MS) {
        spent.shift();
    }
    return spent.reduce((sum, s) => sum + s.weight, 0);
}

function nextWaiter(): Waiter | undefined {
    return waiters.find(w => w.priority === 'detail') ?? waiters[0];
}

function schedule(delayMs: number): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
        timer = null;
        pump();
    }, Math.max(0, delayMs));
}

function pump(): void {
    const now = Date.now();

    if (pause) {
        if (now < pause.until) {
            schedule(pause.until - now);
            return;
        }
        setPause(null);
    }

    for (let waiter = nextWaiter(); waiter; waiter = nextWaiter()) {
        const used = spentInWindow(now);
        // A request heavier than the whole budget still goes through once the window is empty
        if (used > 0 && used + waiter.weight > FETCH_BUDGET_PER_MINUTE) {
            schedule(spent[0].at + WINDOW_MS - now);
            return;
        }
        waiters.splice(waiters.indexOf(waiter), 1);
        if (waiter.onAbort) waiter.signal?.removeEventListener('abort', waiter.onAbort);
        spent.push({ at: now, weight: waiter.weight });
        waiter.resolve();
    }
}

/** Resolves once `weight` calls fit in the budget and Open-Meteo isn't rate-limiting us. */
export function acquireBudget(weight: number, priority: FetchPriority, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
        }
        const waiter: Waiter = { weight, priority, resolve, reject, signal };
        if (signal) {
            waiter.onAbort = () => {
                const index = waiters.indexOf(waiter);
                if (index !== -1) waiters.splice(index, 1);
                reject(new DOMException('Aborted', 'AbortError'));
            };
            signal.addEventListener('abort', waiter.onAbort, { once: true });
        }
        waiters.push(waiter);
        pump();
    });
}

function setPause(next: BudgetPause | null): void {
    pause = next;
    pauseListeners.forEach(listener => listener());
}

function resetTime(window: RateLimitWindow, now: number): number {
    const date = new Date(now);
    switch (window) {
        case 'minute':
            return now + WINDOW_MS;
        case 'hour':
            date.setUTCMinutes(60, 5, 0); // top of the next hour, plus a few seconds of slack
            return date.getTime();
        case 'day':
            date.setUTCHours(24, 0, 5, 0); // next UTC midnight
            return date.getTime();
    }
}

/** Pause all fetching until Open-Meteo's `window` resets. */
export function reportRateLimit(window: RateLimitWindow): void {
    const until = resetTime(window, Date.now());
    if (!pause || until > pause.until) {
        setPause({ window, until });
    }
    pump();
}

export function getBudgetPause(): BudgetPause | null {
    return pause;
}

export function subscribeBudgetPause(listener: () => void): () => void {
    pauseListeners.add(listener);
    return () => pauseListeners.delete(listener);
}

/**
 * Reads which window a rate-limit error refers to. The openmeteo SDK throws the
 * 429 body's reason, e.g. "Daily API request limit exceeded. Please try again tomorrow."
 */
export function rateLimitWindowOf(error: unknown): RateLimitWindow | null {
    const message = error instanceof Error ? error.message : '';
    if (/daily|monthly/i.test(message)) return 'day';
    if (/hourly/i.test(message)) return 'hour';
    if (/minutely|limit exceeded|too many/i.test(message)) return 'minute';
    return null;
}

/**
 * fetchWeatherApi from the openmeteo SDK, spent against the Fetch budget.
 * Rate-limited requests wait out the pause and are retried; other errors are thrown.
 */
export async function fetchWeatherApiWithinBudget(
    params: Parameters<typeof callWeight>[0] & Record<string, unknown>,
    priority: FetchPriority,
    signal?: AbortSignal
): ReturnType<typeof fetchWeatherApi> {
    const weight = callWeight(params);

    for (;;) {
        await acquireBudget(weight, priority, signal);
        try {
            return await fetchWeatherApi(OPEN_METEO_FORECAST_URL, params, 3, 0.2, 2, { signal });
        } catch (error) {
            const window = rateLimitWindowOf(error);
            if (!window || signal?.aborted) throw error;
            reportRateLimit(window);
        }
    }
}

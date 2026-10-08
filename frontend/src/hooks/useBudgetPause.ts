import { useSyncExternalStore } from 'react';
import { getBudgetPause, subscribeBudgetPause, type BudgetPause } from '../utils/openMeteoBudget';

/** The current rate-limit pause, or null while Open-Meteo is accepting requests. */
export function useBudgetPause(): BudgetPause | null {
    return useSyncExternalStore(subscribeBudgetPause, getBudgetPause);
}

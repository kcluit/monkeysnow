import { useEffect, useState } from 'react';
import { useBudgetPause } from '../hooks/useBudgetPause';
import { useLanguage } from '../hooks/useLanguage';
import { interpolate } from '../locales';
import { FETCH_BUDGET_PER_MINUTE } from '../utils/openMeteoBudget';

const NOUN_KEYS = {
    resorts: ['fetchStatus.resort', 'fetchStatus.resorts'],
    models: ['fetchStatus.model', 'fetchStatus.models'],
} as const;

interface FetchStatusProps {
    /** How many things are still waiting to load */
    count: number;
    /** Open-Meteo calls needed to load them */
    calls: number;
    things: 'resorts' | 'models';
    /** Only show while Open-Meteo is rate-limiting us */
    onlyWhenLimited?: boolean;
    className?: string;
}

/**
 * One line saying what's still loading and roughly when it will arrive:
 * "160 resorts queued · ~1 min", or "Limit reached · …" during a rate-limit pause.
 */
export function FetchStatus({ count, calls, things, onlyWhenLimited = false, className }: FetchStatusProps): JSX.Element | null {
    const { t } = useLanguage();
    const pause = useBudgetPause();
    const [now, setNow] = useState(() => Date.now());

    // Keep the countdown roughly current while there's something to count down
    useEffect(() => {
        if (count === 0) return;
        const interval = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(interval);
    }, [count]);

    if (count === 0 || (onlyWhenLimited && !pause)) return null;

    const [singular, plural] = NOUN_KEYS[things];
    const noun = t(count === 1 ? singular : plural);
    const loadMs = Math.ceil(calls / FETCH_BUDGET_PER_MINUTE) * 60_000;
    const formatEta = (ms: number) => {
        const minutes = Math.max(1, Math.round(ms / 60_000));
        return minutes < 60
            ? interpolate(t('fetchStatus.etaMinutes'), { n: minutes })
            : interpolate(t('fetchStatus.etaHours'), { n: Math.round(minutes / 60) });
    };

    let text: string;
    if (!pause) {
        text = interpolate(t('fetchStatus.queued'), { count, things: noun, eta: formatEta(loadMs) });
    } else if (pause.window === 'day') {
        text = interpolate(t('fetchStatus.limitReachedTomorrow'), { count, things: noun });
    } else {
        const wait = Math.max(0, pause.until - now) + loadMs;
        text = interpolate(t('fetchStatus.limitReached'), { count, things: noun, eta: formatEta(wait) });
    }

    return (
        <div className={className ?? 'text-center py-3 text-sm text-theme-textSecondary'} role="status">
            {text}
        </div>
    );
}

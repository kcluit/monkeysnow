/**
 * History's switch, one for the Main page and the Detailed view, in both pages' utility bars:
 * in the accent while the past days are shown.
 */

import { useLanguage } from '../hooks/useLanguage';

interface HistorySwitchProps {
    isHistory: boolean;
    setIsHistory: (on: boolean) => void;
    className?: string;
}

/** The large utility bars' button, filled with the accent while on */
export function HistorySwitch({ isHistory, setIsHistory, className = '' }: HistorySwitchProps): JSX.Element {
    const { t } = useLanguage();
    return (
        <button
            onClick={() => setIsHistory(!isHistory)}
            aria-pressed={isHistory}
            title={t(isHistory ? 'history.backToForecast' : 'history.showPast')}
            className={`${className} border rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-colors duration-200 ${isHistory
                ? 'bg-theme-accent border-theme-accent text-theme-background hover:opacity-90'
                : 'bg-theme-background border-theme-border text-theme-textPrimary hover:bg-theme-secondary'}`}
        >
            {t('history.switch')}
        </button>
    );
}

/** The compact utility bars' word, in the accent while on */
export function CompactHistorySwitch({ isHistory, setIsHistory, className = '' }: HistorySwitchProps): JSX.Element {
    const { t } = useLanguage();
    return (
        <button
            onClick={() => setIsHistory(!isHistory)}
            aria-pressed={isHistory}
            title={t(isHistory ? 'history.backToForecast' : 'history.showPast')}
            className={`${className} compact-bar-text transition-colors ${isHistory
                ? 'text-theme-accent'
                : 'text-theme-textSecondary hover:text-theme-textPrimary hover:font-bold'
                }`}
        >
            {t('history.switch')}
        </button>
    );
}

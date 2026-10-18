/**
 * History's switch, one for the Main page and the Detailed view, in both pages' utility bars:
 * in the accent while the past days are shown.
 */

interface HistorySwitchProps {
    isHistory: boolean;
    setIsHistory: (on: boolean) => void;
    className?: string;
}

const title = (isHistory: boolean): string =>
    isHistory ? 'Back to the forecast' : 'Show the past days instead of the forecast';

/** The large utility bars' button, filled with the accent while on */
export function HistorySwitch({ isHistory, setIsHistory, className = '' }: HistorySwitchProps): JSX.Element {
    return (
        <button
            onClick={() => setIsHistory(!isHistory)}
            aria-pressed={isHistory}
            title={title(isHistory)}
            className={`${className} border rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-colors duration-200 ${isHistory
                ? 'bg-theme-accent border-theme-accent text-theme-background hover:opacity-90'
                : 'bg-theme-background border-theme-border text-theme-textPrimary hover:bg-theme-secondary'}`}
        >
            History
        </button>
    );
}

/** The compact utility bars' word, in the accent while on */
export function CompactHistorySwitch({ isHistory, setIsHistory, className = '' }: HistorySwitchProps): JSX.Element {
    return (
        <button
            onClick={() => setIsHistory(!isHistory)}
            aria-pressed={isHistory}
            title={title(isHistory)}
            className={`${className} compact-bar-text transition-colors ${isHistory
                ? 'text-theme-accent'
                : 'text-theme-textSecondary hover:text-theme-textPrimary hover:font-bold'
                }`}
        >
            History
        </button>
    );
}

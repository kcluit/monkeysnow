/**
 * Beside a card's name on History, and the Detailed view's heading, so the past days aren't taken
 * for the forecast. It has the History switch's accent fill, and counts the days shown: the History
 * length, or on a card fewer while History fetched for a longer one is still on its way.
 */
export function HistoryBadge({ days }: { days: number }): JSX.Element {
    return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-theme-accent text-theme-background">
            History · past {days} days
        </span>
    );
}

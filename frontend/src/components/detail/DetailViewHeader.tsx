import type { DetailViewHeaderProps } from '../../types/detailView';

export function DetailViewHeader({ resortName, elevation, onBack }: DetailViewHeaderProps): JSX.Element {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-secondary hover:bg-theme-cardBg transition-colors text-theme-accent"
          title="Back to resort list"
        >
          <img src="/2744.webp" alt="" className="w-6 h-6" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-theme-textPrimary">{resortName}</h1>
          <p className="text-sm text-theme-textSecondary">
            Detailed Forecast at {elevation}m
          </p>
        </div>
      </div>
    </div>
  );
}

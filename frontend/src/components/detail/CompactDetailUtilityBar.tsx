import type { DetailUtilityBarProps } from '../../types/detailView';
import type { ElevationSelection } from '../../types/detailView';
import { useVariableSelection } from '../../hooks/useVariableSelection';
import { VariableSelectionModal } from '../VariableSelectionModal';
import { formatElevation } from '../../utils/unitConversion';
import { FORECAST_HORIZONS, HISTORY_LENGTHS } from '../../utils/constants';
import { CompactHistorySwitch } from '../HistorySwitch';
import { Icon } from '../Icon';
import { icons } from '../../constants/icons';
import { useLanguage } from '../../hooks/useLanguage';

export function CompactDetailUtilityBar({
    onBack,
    unitSystem,
    shownModelCount,
    selectedModelCount,
    aggregationCount,
    onOpenModels,
    selectedVariables,
    setSelectedVariables,
    elevationSelection,
    setElevationSelection,
    forecastDays,
    setForecastDays,
    isHistory,
    setIsHistory,
    historyLength,
    setHistoryLength,
    isChartLocked,
    setIsChartLocked,
    fixedElevation,
    customLocation,
    groundElevation,
    customElevation,
    setCustomElevation,
    onResetCustomLocation,
}: DetailUtilityBarProps): JSX.Element {
    const { t } = useLanguage();

    // Variable selection hook for modal
    const variableSelection = useVariableSelection({
        selectedVariables,
        setSelectedVariables,
    });

    // Cycle elevation: base → mid → top → base
    const cycleElevation = (): void => {
        const presets: ElevationSelection[] = ['base', 'mid', 'top'];
        if (typeof elevationSelection === 'number') {
            setElevationSelection('base');
        } else {
            const currentIndex = presets.indexOf(elevationSelection);
            const nextIndex = (currentIndex + 1) % presets.length;
            setElevationSelection(presets[nextIndex]);
        }
    };

    const getElevationText = (): string => {
        if (elevationSelection === 'base') return t('band.base');
        if (elevationSelection === 'mid') return t('band.mid');
        if (elevationSelection === 'top') return t('band.top');
        return formatElevation(elevationSelection, unitSystem);
    };

    // Cycle the days shown: the Forecast horizon 1 → 3 → 7 → 14 → 16 → 1, or while History is on
    // the History length 3 → 7 → 14 → 30 → 3
    const days = isHistory ? historyLength : forecastDays;
    const cycleDays = (): void => {
        const choices = isHistory ? HISTORY_LENGTHS : FORECAST_HORIZONS;
        const next = choices[(choices.indexOf(days) + 1) % choices.length];
        if (isHistory) setHistoryLength(next);
        else setForecastDays(next);
    };

    // Model button text: Comparison models shown here / Selected models
    const getModelButtonText = (): string => {
        const counts = { shown: shownModelCount, selected: selectedModelCount };
        if (aggregationCount > 0) return t('detail.modelsButtonWithAggregationsCompact', { ...counts, aggregations: aggregationCount });
        return t('detail.modelsButton', counts);
    };

    return (
        <>
            <div className="compact-utility-bar mb-6 flex justify-center">
                {/* Wraps on phones, where the separators would dangle at line ends */}
                <div className="compact-utility-bar-inner inline-flex flex-wrap justify-center max-w-full items-center gap-x-3 sm:gap-x-2 gap-y-1 px-4 py-2 rounded-lg bg-theme-secondary">
                    {/* Back */}
                    <button
                        onClick={onBack}
                        className="compact-bar-text text-theme-textSecondary hover:text-theme-textPrimary hover:font-bold transition-colors"
                    >
                        {t('detail.back')}
                    </button>

                    <span className="compact-bar-separator hidden sm:inline">|</span>

                    {/* Models - opens modal */}
                    <button
                        onClick={onOpenModels}
                        className="compact-bar-text text-theme-textSecondary hover:text-theme-textPrimary hover:font-bold transition-colors"
                    >
                        {getModelButtonText()}
                    </button>

                    <span className="compact-bar-separator hidden sm:inline">|</span>

                    {/* Elevation - a Saved location has only its own */}
                    {!customLocation && fixedElevation !== undefined ? (
                        <span className="compact-bar-text text-theme-accent">
                            {formatElevation(fixedElevation, unitSystem)}
                        </span>
                    ) : !customLocation ? (
                        <button
                            onClick={cycleElevation}
                            className="compact-bar-text text-theme-textSecondary hover:text-theme-accent transition-colors"
                        >
                            {getElevationText()}
                        </button>
                    ) : customElevation !== null ? (
                        // A Custom elevation can only be typed in the large bar; here a click goes back to Ground
                        <button
                            onClick={() => setCustomElevation(null)}
                            title={t('detail.forecastAtGround')}
                            className="compact-bar-text text-theme-accent hover:text-theme-textPrimary transition-colors"
                        >
                            {formatElevation(customElevation, unitSystem)}
                        </button>
                    ) : (
                        <span className="compact-bar-text text-theme-accent">
                            {groundElevation === null
                                ? '...'
                                : formatElevation(groundElevation, unitSystem)}
                        </span>
                    )}

                    <span className="compact-bar-separator hidden sm:inline">|</span>

                    {/* History - On or off, in the accent while on */}
                    <CompactHistorySwitch isHistory={isHistory} setIsHistory={setIsHistory} />

                    <span className="compact-bar-separator hidden sm:inline">|</span>

                    {/* Days shown - cycle */}
                    <button
                        onClick={cycleDays}
                        title={isHistory ? t('detail.historyLength') : t('detail.forecastHorizon')}
                        className="compact-bar-text text-theme-textSecondary hover:text-theme-accent transition-colors"
                    >
                        {t('detail.daysShort', { count: days })}
                    </button>

                    <span className="compact-bar-separator hidden sm:inline">|</span>

                    {/* Charts - opens the picker */}
                    <button
                        onClick={variableSelection.openModal}
                        className="compact-bar-text text-theme-textSecondary hover:text-theme-textPrimary hover:font-bold transition-colors"
                    >
                        {t('detail.charts', { count: selectedVariables.length })}
                    </button>

                    <span className="compact-bar-separator hidden sm:inline">|</span>

                    {/* Lock Toggle */}
                    <button
                        onClick={() => setIsChartLocked(!isChartLocked)}
                        className="compact-bar-text text-theme-textSecondary hover:text-theme-accent transition-colors"
                    >
                        <Icon icon={isChartLocked ? icons.lock : icons.lockOpen} />
                    </button>

                    {/* Reset location button when custom location active */}
                    {customLocation && (
                        <>
                            <span className="compact-bar-separator hidden sm:inline">|</span>
                            <button
                                onClick={onResetCustomLocation}
                                className="compact-bar-text text-red-500 hover:text-red-400 transition-colors"
                            >
                                {t('detail.resetLocation')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Variable Selection Modal */}
            <VariableSelectionModal selection={variableSelection} />
        </>
    );
}

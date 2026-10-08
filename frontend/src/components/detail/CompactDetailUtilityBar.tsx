import type { DetailUtilityBarProps } from '../../types/detailView';
import type { ElevationSelection } from '../../types/detailView';
import { useVariableSelection } from '../../hooks/useVariableSelection';
import { VariableSelectionModal } from '../VariableSelectionModal';
import { formatElevation } from '../../utils/unitConversion';
import { Icon } from '../Icon';
import { icons } from '../../constants/icons';

export function CompactDetailUtilityBar({
    onBack,
    unitSystem,
    shownModelCount,
    preferredModelCount,
    aggregationCount,
    onOpenModels,
    selectedVariables,
    setSelectedVariables,
    elevationSelection,
    setElevationSelection,
    forecastDays,
    setForecastDays,
    isChartLocked,
    setIsChartLocked,
    fixedElevation,
    customLocation,
    groundElevation,
    customElevation,
    setCustomElevation,
    onResetCustomLocation,
}: DetailUtilityBarProps): JSX.Element {
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
        if (elevationSelection === 'base') return 'Base';
        if (elevationSelection === 'mid') return 'Mid';
        if (elevationSelection === 'top') return 'Top';
        return formatElevation(elevationSelection, unitSystem);
    };

    // Cycle forecast days: 1 → 3 → 7 → 14 → 16 → 1
    const cycleForecastDays = (): void => {
        const options = [1, 3, 7, 14, 16];
        const currentIndex = options.indexOf(forecastDays);
        const nextIndex = (currentIndex + 1) % options.length;
        setForecastDays(options[nextIndex]);
    };

    // Model button text: Comparison models shown here / Preferred models
    const getModelButtonText = (): string => {
        const modelCount = `${shownModelCount}/${preferredModelCount}`;
        if (aggregationCount > 0) return `Models (${modelCount}+${aggregationCount})`;
        return `Models (${modelCount})`;
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
                        Back
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
                            title="Forecast at the ground elevation again"
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

                    {/* Forecast Days - cycle */}
                    <button
                        onClick={cycleForecastDays}
                        className="compact-bar-text text-theme-textSecondary hover:text-theme-accent transition-colors"
                    >
                        {forecastDays}d
                    </button>

                    <span className="compact-bar-separator hidden sm:inline">|</span>

                    {/* Variables - opens modal */}
                    <button
                        onClick={variableSelection.openModal}
                        className="compact-bar-text text-theme-textSecondary hover:text-theme-textPrimary hover:font-bold transition-colors"
                    >
                        Variables ({selectedVariables.length})
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
                                Reset Location
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

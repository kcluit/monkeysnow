import type { DetailUtilityBarProps } from '../../types/detailView';
import type { ElevationSelection } from '../../types/detailView';
import { useModelHierarchy } from '../../hooks/useModelHierarchy';
import { useVariableSelection } from '../../hooks/useVariableSelection';
import { ModelSelectionGridModal } from '../ModelSelectionModal';
import { VariableSelectionModal } from '../VariableSelectionModal';

export function CompactDetailUtilityBar({
    onBack,
    selectedModels,
    setSelectedModels,
    selectedVariables,
    setSelectedVariables,
    selectedAggregations,
    setSelectedAggregations,
    aggregationColors,
    setAggregationColors,
    hideAggregationMembers,
    setHideAggregationMembers,
    showMinMaxFill,
    setShowMinMaxFill,
    showPercentileFill,
    setShowPercentileFill,
    elevationSelection,
    setElevationSelection,
    resolvedElevation,
    forecastDays,
    setForecastDays,
    location,
    isChartLocked,
    setIsChartLocked,
    customLocation,
    onResetCustomLocation,
    isLoadingElevation,
}: DetailUtilityBarProps): JSX.Element {
    // Model hierarchy hook for modal
    const modelHierarchy = useModelHierarchy({
        selectedModels,
        onModelsChange: setSelectedModels,
        selectedAggregations,
        onAggregationsChange: setSelectedAggregations,
        aggregationColors,
        onAggregationColorsChange: setAggregationColors,
    });

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
        return `${elevationSelection}m`;
    };

    // Cycle forecast days: 1 → 3 → 7 → 14 → 16 → 1
    const cycleForecastDays = (): void => {
        const options = [1, 3, 7, 14, 16];
        const currentIndex = options.indexOf(forecastDays);
        const nextIndex = (currentIndex + 1) % options.length;
        setForecastDays(options[nextIndex]);
    };

    // Model button text
    const getModelButtonText = (): string => {
        const modelCount = selectedModels.length;
        const aggCount = selectedAggregations.length;
        if (aggCount > 0) return `Models (${modelCount}+${aggCount})`;
        return `Models (${modelCount})`;
    };

    return (
        <>
            <div className="compact-utility-bar mb-6 flex justify-center">
                <div className="compact-utility-bar-inner inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-secondary">
                    {/* Back */}
                    <button
                        onClick={onBack}
                        className="compact-bar-text text-theme-textSecondary hover:text-theme-textPrimary hover:font-bold transition-colors"
                    >
                        Back
                    </button>

                    <span className="compact-bar-separator">|</span>

                    {/* Models - opens modal */}
                    <button
                        onClick={modelHierarchy.openModal}
                        className="compact-bar-text text-theme-textSecondary hover:text-theme-textPrimary hover:font-bold transition-colors"
                    >
                        {getModelButtonText()}
                    </button>

                    <span className="compact-bar-separator">|</span>

                    {/* Elevation */}
                    {!customLocation ? (
                        <button
                            onClick={cycleElevation}
                            className="compact-bar-text text-theme-textSecondary hover:text-theme-accent transition-colors"
                        >
                            {getElevationText()}
                        </button>
                    ) : (
                        <span className="compact-bar-text text-theme-accent">
                            {isLoadingElevation || customLocation.elevation === null
                                ? '...'
                                : `${customLocation.elevation}m`}
                        </span>
                    )}

                    <span className="compact-bar-separator">|</span>

                    {/* Forecast Days - cycle */}
                    <button
                        onClick={cycleForecastDays}
                        className="compact-bar-text text-theme-textSecondary hover:text-theme-accent transition-colors"
                    >
                        {forecastDays}d
                    </button>

                    <span className="compact-bar-separator">|</span>

                    {/* Variables - opens modal */}
                    <button
                        onClick={variableSelection.openModal}
                        className="compact-bar-text text-theme-textSecondary hover:text-theme-textPrimary hover:font-bold transition-colors"
                    >
                        Variables ({selectedVariables.length})
                    </button>

                    <span className="compact-bar-separator">|</span>

                    {/* Lock Toggle */}
                    <button
                        onClick={() => setIsChartLocked(!isChartLocked)}
                        className="compact-bar-text text-theme-textSecondary hover:text-theme-accent transition-colors"
                    >
                        {isChartLocked ? 'Locked' : 'Unlocked'}
                    </button>

                    {/* Reset location button when custom location active */}
                    {customLocation && (
                        <>
                            <span className="compact-bar-separator">|</span>
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

            {/* Model Selection Modal */}
            <ModelSelectionGridModal
                hierarchy={modelHierarchy}
                hideAggregationMembers={hideAggregationMembers}
                onToggleHideMembers={() => setHideAggregationMembers(!hideAggregationMembers)}
                showMinMaxFill={showMinMaxFill}
                onToggleMinMaxFill={() => setShowMinMaxFill(!showMinMaxFill)}
                showPercentileFill={showPercentileFill}
                onTogglePercentileFill={() => setShowPercentileFill(!showPercentileFill)}
            />

            {/* Variable Selection Modal */}
            <VariableSelectionModal selection={variableSelection} />
        </>
    );
}

import { useState, useEffect } from 'react';
import type { DetailUtilityBarProps } from '../../types/detailView';
import { useModelHierarchy } from '../../hooks/useModelHierarchy';
import { useVariableSelection } from '../../hooks/useVariableSelection';
import { ModelSelectionGridModal } from '../ModelSelectionModal';
import { VariableSelectionModal } from '../VariableSelectionModal';

export function DetailUtilityBar({
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
    onBack,
    isChartLocked,
    setIsChartLocked,
    customLocation,
    onResetCustomLocation,
    isLoadingElevation,
}: DetailUtilityBarProps): JSX.Element {
    const [showElevationDropdown, setShowElevationDropdown] = useState(false);
    const [showForecastDropdown, setShowForecastDropdown] = useState(false);
    const [showCustomElevationInput, setShowCustomElevationInput] = useState(false);
    const [customElevationValue, setCustomElevationValue] = useState('');

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

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent): void => {
            if (!(e.target as HTMLElement).closest('[data-dropdown]')) {
                setShowElevationDropdown(false);
                setShowForecastDropdown(false);
                setShowCustomElevationInput(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleCustomElevationSubmit = () => {
        const value = parseInt(customElevationValue, 10);
        if (!isNaN(value) && value >= 0 && value <= 9000) {
            setElevationSelection(value);
            setShowElevationDropdown(false);
            setShowCustomElevationInput(false);
            setCustomElevationValue('');
        }
    };

    const handleCustomElevationKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCustomElevationSubmit();
        } else if (e.key === 'Escape') {
            setShowCustomElevationInput(false);
            setCustomElevationValue('');
        }
    };

    // Get model button text
    const getModelButtonText = (): string => {
        const modelCount = selectedModels.length;
        const aggCount = selectedAggregations.length;
        if (aggCount > 0) {
            return `Models (${modelCount} + ${aggCount})`;
        }
        return `Models (${modelCount})`;
    };

    return (
        <div className="mb-6 flex flex-wrap gap-4 items-center">
            {/* Back button */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-secondary hover:bg-theme-cardBg transition-colors text-theme-accent"
            >
                <img src="/2744.webp" alt="" className="w-5 h-5" />
                <span className="text-sm font-medium">Back</span>
            </button>

            <div className="h-6 w-px bg-theme-border" />

            {/* Model Selection Button - Opens Modal */}
            <button
                onClick={modelHierarchy.openModal}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-background border border-theme-border hover:bg-theme-secondary transition-colors"
            >
                <span className="text-sm text-theme-textPrimary">
                    {getModelButtonText()}
                </span>
                <svg className="w-4 h-4 text-theme-textSecondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Elevation Dropdown - hidden when custom location is active */}
            {!customLocation ? (
                <div className="relative" data-dropdown>
                    <button
                        onClick={() => {
                            setShowElevationDropdown(!showElevationDropdown);
                            setShowForecastDropdown(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-background border border-theme-border hover:bg-theme-secondary transition-colors"
                    >
                        <span className="text-sm text-theme-textSecondary">Elevation:</span>
                        <span className="text-sm text-theme-textPrimary font-medium">
                            {elevationSelection === 'base' ? 'Base' :
                                elevationSelection === 'mid' ? 'Mid' :
                                    elevationSelection === 'top' ? 'Top' :
                                        `${elevationSelection}m`}
                        </span>
                        <svg className="w-4 h-4 text-theme-textSecondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {showElevationDropdown && (
                        <div className="absolute left-0 z-20 mt-1 w-48 bg-theme-background rounded-lg shadow-lg border border-theme-border p-1">
                            {[
                                { label: 'Base', selectionType: 'base' as const, displayValue: location.baseElevation },
                                { label: 'Mid', selectionType: 'mid' as const, displayValue: location.midElevation },
                                { label: 'Top', selectionType: 'top' as const, displayValue: location.topElevation },
                            ].map((option) => (
                                <button
                                    key={option.label}
                                    onClick={() => {
                                        setElevationSelection(option.selectionType);
                                        setShowElevationDropdown(false);
                                        setShowCustomElevationInput(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${elevationSelection === option.selectionType
                                            ? 'bg-theme-secondary text-theme-textPrimary'
                                            : 'text-theme-textSecondary hover:bg-theme-secondary hover:text-theme-textPrimary'
                                        }`}
                                >
                                    <span>{option.label}</span>
                                    <span className="text-xs text-theme-textSecondary opacity-70">{option.displayValue}m</span>
                                </button>
                            ))}
                            <div className="border-t border-theme-border mt-1 pt-1">
                                {!showCustomElevationInput ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowCustomElevationInput(true);
                                            setCustomElevationValue(
                                                typeof elevationSelection === 'number'
                                                    ? elevationSelection.toString()
                                                    : resolvedElevation.toString()
                                            );
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${typeof elevationSelection === 'number'
                                                ? 'bg-theme-secondary text-theme-textPrimary'
                                                : 'text-theme-textSecondary hover:bg-theme-secondary hover:text-theme-textPrimary'
                                            }`}
                                    >
                                        <span>Custom...</span>
                                        {typeof elevationSelection === 'number' && (
                                            <span className="text-xs text-theme-textSecondary opacity-70">{elevationSelection}m</span>
                                        )}
                                    </button>
                                ) : (
                                    <div className="px-2 py-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={customElevationValue}
                                                onChange={(e) => setCustomElevationValue(e.target.value)}
                                                onKeyDown={handleCustomElevationKeyDown}
                                                placeholder="Elevation"
                                                min="0"
                                                max="9000"
                                                autoFocus
                                                className="w-full px-2 py-1 text-sm rounded border border-theme-border bg-theme-cardBg text-theme-textPrimary placeholder-theme-textSecondary focus:outline-none focus:border-theme-accent"
                                            />
                                            <span className="text-sm text-theme-textSecondary">m</span>
                                        </div>
                                        <div className="flex gap-1 mt-2">
                                            <button
                                                onClick={handleCustomElevationSubmit}
                                                className="flex-1 px-2 py-1 text-xs rounded bg-theme-accent text-white hover:opacity-90"
                                            >
                                                Apply
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowCustomElevationInput(false);
                                                    setCustomElevationValue('');
                                                }}
                                                className="flex-1 px-2 py-1 text-xs rounded bg-theme-secondary text-theme-textSecondary hover:bg-theme-cardBg"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Custom location elevation display + reset button */
                <>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-secondary border border-theme-border">
                        <span className="text-sm text-theme-textSecondary">Elevation:</span>
                        {isLoadingElevation || customLocation.elevation === null ? (
                            <span className="text-sm text-theme-textPrimary font-medium animate-pulse">Loading...</span>
                        ) : (
                            <span className="text-sm text-theme-textPrimary font-medium">{customLocation.elevation}m</span>
                        )}
                    </div>
                    <button
                        onClick={onResetCustomLocation}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors text-red-500"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-sm font-medium">Reset Location</span>
                    </button>
                </>
            )}

            <div className="h-6 w-px bg-theme-border" />

            {/* Forecast Days Dropdown */}
            <div className="relative" data-dropdown>
                <button
                    onClick={() => {
                        setShowForecastDropdown(!showForecastDropdown);
                        setShowElevationDropdown(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-background border border-theme-border hover:bg-theme-secondary transition-colors"
                >
                    <span className="text-sm text-theme-textSecondary">Forecast:</span>
                    <span className="text-sm text-theme-textPrimary font-medium">
                        {forecastDays} Days
                    </span>
                    <svg className="w-4 h-4 text-theme-textSecondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {showForecastDropdown && (
                    <div className="absolute left-0 z-20 mt-1 w-32 bg-theme-background rounded-lg shadow-lg border border-theme-border p-1">
                        {[1, 3, 7, 14, 16].map((days) => (
                            <button
                                key={days}
                                onClick={() => {
                                    setForecastDays(days);
                                    setShowForecastDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm ${forecastDays === days
                                        ? 'bg-theme-secondary text-theme-textPrimary'
                                        : 'text-theme-textSecondary hover:bg-theme-secondary hover:text-theme-textPrimary'
                                    }`}
                            >
                                {days} Days
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="h-6 w-px bg-theme-border" />

            {/* Variable Selection Button - Opens Modal */}
            <button
                onClick={variableSelection.openModal}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-background border border-theme-border hover:bg-theme-secondary transition-colors"
            >
                <span className="text-sm text-theme-textPrimary">
                    Variables ({selectedVariables.length})
                </span>
                <svg className="w-4 h-4 text-theme-textSecondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <div className="h-6 w-px bg-theme-border" />

            {/* Lock Button - toggles scroll zoom and range slider */}
            <button
                onClick={() => setIsChartLocked(!isChartLocked)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors bg-theme-background border border-theme-border hover:bg-theme-secondary text-theme-textPrimary"
                title={isChartLocked ? 'Unlock charts (enable zoom and slider)' : 'Lock charts (disable zoom and hide slider)'}
            >
                <span className="text-lg">{isChartLocked ? '🔒' : '🔓'}</span>
            </button>

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
        </div>
    );
}

import { useState, useEffect } from 'react';
import type { DetailUtilityBarProps } from '../../types/detailView';
import { useVariableSelection } from '../../hooks/useVariableSelection';
import { VariableSelectionModal } from '../VariableSelectionModal';
import { CompactDetailUtilityBar } from './CompactDetailUtilityBar';
import { Icon } from '../Icon';
import { icons } from '../../constants/icons';
import { formatElevation } from '../../utils/unitConversion';

/** The Elevation menu's width in px (w-48) */
const ELEVATION_MENU_WIDTH = 192;

export function DetailUtilityBar(props: DetailUtilityBarProps): JSX.Element {
    if (props.utilityBarStyle === 'compact') {
        return <CompactDetailUtilityBar {...props} />;
    }

    return <LargeDetailUtilityBar {...props} />;
}

function LargeDetailUtilityBar({
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
    resolvedElevation,
    forecastDays,
    setForecastDays,
    location,
    isChartLocked,
    setIsChartLocked,
    fixedElevation,
    customLocation,
    groundElevation,
    customElevation,
    setCustomElevation,
    onResetCustomLocation,
}: DetailUtilityBarProps): JSX.Element {
    const [showElevationDropdown, setShowElevationDropdown] = useState(false);
    const [elevationMenuOpensLeft, setElevationMenuOpensLeft] = useState(false);
    const [showForecastDropdown, setShowForecastDropdown] = useState(false);
    const [showCustomElevationInput, setShowCustomElevationInput] = useState(false);
    const [customElevationValue, setCustomElevationValue] = useState('');

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

    const elevationUnit = unitSystem === 'imperial' ? 'ft' : 'm';
    const maxElevationInput = unitSystem === 'imperial' ? 29528 : 9000;

    // The menu's presets above "Custom...": a Resort's Elevation bands, or a Custom location's Ground elevation
    const elevationPresets: { label: string; elevation: number | null; isSelected: boolean; select: () => void }[] = customLocation
        ? [
            { label: 'Ground', elevation: groundElevation, isSelected: customElevation === null, select: () => setCustomElevation(null) },
        ]
        : [
            { label: 'Base', elevation: location.baseElevation, isSelected: elevationSelection === 'base', select: () => setElevationSelection('base') },
            { label: 'Mid', elevation: location.midElevation, isSelected: elevationSelection === 'mid', select: () => setElevationSelection('mid') },
            { label: 'Top', elevation: location.topElevation, isSelected: elevationSelection === 'top', select: () => setElevationSelection('top') },
        ];
    // The Custom elevation in effect, if one was typed
    const typedElevation = customLocation
        ? customElevation
        : typeof elevationSelection === 'number' ? elevationSelection : null;
    const groundText = groundElevation === null ? 'Ground' : `Ground ${formatElevation(groundElevation, unitSystem)}`;
    const elevationButtonText = typedElevation !== null
        ? formatElevation(typedElevation, unitSystem)
        : customLocation ? groundText : elevationPresets.find((preset) => preset.isSelected)?.label;

    const handleCustomElevationSubmit = () => {
        const value = parseInt(customElevationValue, 10);
        if (!isNaN(value) && value >= 0 && value <= maxElevationInput) {
            // Convert to meters for internal storage if imperial
            const meters = unitSystem === 'imperial' ? Math.round(value / 3.28084) : value;
            if (customLocation) {
                setCustomElevation(meters);
            } else {
                setElevationSelection(meters);
            }
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

    // Get model button text: Comparison models shown here / Preferred models
    const getModelButtonText = (): string => {
        const modelCount = `${shownModelCount}/${preferredModelCount}`;
        if (aggregationCount > 0) {
            return `Models (${modelCount} + ${aggregationCount})`;
        }
        return `Models (${modelCount})`;
    };

    return (
        <div className="mb-6 flex flex-wrap gap-4 items-center">
            {/* Back Button */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-background border border-theme-border hover:bg-theme-secondary transition-colors"
            >
                <Icon icon={icons.chevronLeft} className="text-theme-textSecondary" />
                <span className="text-sm text-theme-textPrimary">Back</span>
            </button>

            {/* Model Selection Button - Opens Modal */}
            <button
                onClick={onOpenModels}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-background border border-theme-border hover:bg-theme-secondary transition-colors"
            >
                <Icon icon={icons.controls} className="text-theme-textSecondary" />
                <span className="text-sm text-theme-textPrimary">
                    {getModelButtonText()}
                </span>
            </button>

            {/* Elevation Dropdown - a Saved location has one elevation; a Custom location offers its Ground elevation */}
            {!customLocation && fixedElevation !== undefined ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-secondary border border-theme-border">
                    <span className="text-sm text-theme-textSecondary">Elevation:</span>
                    <span className="text-sm text-theme-textPrimary font-medium">{formatElevation(fixedElevation, unitSystem)}</span>
                </div>
            ) : (
                <>
                    <div className="relative" data-dropdown>
                        <button
                            onClick={(e) => {
                                // On a phone the button can end its row at the screen's edge: the menu then opens leftwards
                                const { left } = e.currentTarget.getBoundingClientRect();
                                setElevationMenuOpensLeft(left + ELEVATION_MENU_WIDTH > document.documentElement.clientWidth);
                                setShowElevationDropdown(!showElevationDropdown);
                                setShowForecastDropdown(false);
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-background border border-theme-border hover:bg-theme-secondary transition-colors"
                        >
                            <span className="text-sm text-theme-textSecondary">Elevation:</span>
                            <span className="text-sm text-theme-textPrimary font-medium">{elevationButtonText}</span>
                            <svg className="w-4 h-4 text-theme-textSecondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showElevationDropdown && (
                            <div className={`absolute ${elevationMenuOpensLeft ? 'right-0' : 'left-0'} z-20 mt-1 w-48 bg-theme-background rounded-lg shadow-lg border border-theme-border p-1`}>
                                {elevationPresets.map((option) => (
                                    <button
                                        key={option.label}
                                        onClick={() => {
                                            option.select();
                                            setShowElevationDropdown(false);
                                            setShowCustomElevationInput(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${option.isSelected
                                                ? 'bg-theme-secondary text-theme-textPrimary'
                                                : 'text-theme-textSecondary hover:bg-theme-secondary hover:text-theme-textPrimary'
                                            }`}
                                    >
                                        <span>{option.label}</span>
                                        {option.elevation !== null && (
                                            <span className="text-xs text-theme-textSecondary opacity-70">{formatElevation(option.elevation, unitSystem)}</span>
                                        )}
                                    </button>
                                ))}
                                <div className="border-t border-theme-border mt-1 pt-1">
                                    {!showCustomElevationInput ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowCustomElevationInput(true);
                                                // Starts from the height being forecast; empty while a Ground elevation is still unknown
                                                const metersValue = typedElevation ?? (customLocation ? groundElevation : resolvedElevation);
                                                const displayValue = metersValue !== null && unitSystem === 'imperial'
                                                    ? Math.round(metersValue * 3.28084)
                                                    : metersValue;
                                                setCustomElevationValue(displayValue === null ? '' : displayValue.toString());
                                            }}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${typedElevation !== null
                                                    ? 'bg-theme-secondary text-theme-textPrimary'
                                                    : 'text-theme-textSecondary hover:bg-theme-secondary hover:text-theme-textPrimary'
                                                }`}
                                        >
                                            <span>Custom...</span>
                                            {typedElevation !== null && (
                                                <span className="text-xs text-theme-textSecondary opacity-70">{formatElevation(typedElevation, unitSystem)}</span>
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
                                                    max={maxElevationInput.toString()}
                                                    autoFocus
                                                    className="w-full px-2 py-1 text-sm rounded border border-theme-border bg-theme-cardBg text-theme-textPrimary placeholder-theme-textSecondary focus:outline-none focus:border-theme-accent"
                                                />
                                                <span className="text-sm text-theme-textSecondary">{elevationUnit}</span>
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

                    {/* Back to the Custom location's Ground elevation, without opening the menu */}
                    {customLocation && customElevation !== null && (
                        <button
                            onClick={() => setCustomElevation(null)}
                            title="Forecast at the ground elevation again"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-background border border-theme-border hover:bg-theme-secondary transition-colors"
                        >
                            <Icon icon={icons.reset} className="text-theme-textSecondary" />
                            <span className="text-sm text-theme-textPrimary">{groundText}</span>
                        </button>
                    )}

                    {customLocation && (
                        <button
                            onClick={onResetCustomLocation}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors text-red-500"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="text-sm font-medium">Reset Location</span>
                        </button>
                    )}
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

            {/* Variable Selection Modal */}
            <VariableSelectionModal selection={variableSelection} />
        </div>
    );
}

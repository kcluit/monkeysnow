import { useState, useEffect } from 'react';
import type { DetailUtilityBarProps } from '../../types/detailView';
import { useVariableSelection } from '../../hooks/useVariableSelection';
import { VariableSelectionModal } from '../VariableSelectionModal';
import { CompactDetailUtilityBar } from './CompactDetailUtilityBar';
import { Icon } from '../Icon';
import { icons } from '../../constants/icons';
import { elevationFromUnits, elevationInUnits, formatElevation, maxTypedElevation } from '../../utils/unitConversion';
import { FORECAST_HORIZONS, HISTORY_LENGTHS } from '../../utils/constants';
import { HistorySwitch } from '../HistorySwitch';
import { useLanguage } from '../../hooks/useLanguage';

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
    selectedModelCount,
    aggregationCount,
    onOpenModels,
    selectedVariables,
    setSelectedVariables,
    elevationSelection,
    setElevationSelection,
    resolvedElevation,
    forecastDays,
    setForecastDays,
    isHistory,
    setIsHistory,
    historyLength,
    setHistoryLength,
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
    const { t, tPlural } = useLanguage();
    const [showElevationDropdown, setShowElevationDropdown] = useState(false);
    const [elevationMenuOpensLeft, setElevationMenuOpensLeft] = useState(false);
    const [showForecastDropdown, setShowForecastDropdown] = useState(false);
    const [showCustomElevationInput, setShowCustomElevationInput] = useState(false);
    const [customElevationValue, setCustomElevationValue] = useState('');

    // While History is on, the days are the History length's rather than the Forecast horizon's
    const days = isHistory ? historyLength : forecastDays;
    const setDays = isHistory ? setHistoryLength : setForecastDays;
    const dayChoices = isHistory ? HISTORY_LENGTHS : FORECAST_HORIZONS;

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
    const maxElevationInput = maxTypedElevation(unitSystem);

    // The menu's presets above "Custom...": a Resort's Elevation bands, or a Custom location's Ground elevation
    const elevationPresets: { id: string; label: string; elevation: number | null; isSelected: boolean; select: () => void }[] = customLocation
        ? [
            { id: 'ground', label: t('detail.ground'), elevation: groundElevation, isSelected: customElevation === null, select: () => setCustomElevation(null) },
        ]
        : [
            { id: 'base', label: t('band.base'), elevation: location.baseElevation, isSelected: elevationSelection === 'base', select: () => setElevationSelection('base') },
            { id: 'mid', label: t('band.mid'), elevation: location.midElevation, isSelected: elevationSelection === 'mid', select: () => setElevationSelection('mid') },
            { id: 'top', label: t('band.top'), elevation: location.topElevation, isSelected: elevationSelection === 'top', select: () => setElevationSelection('top') },
        ];
    // The Custom elevation in effect, if one was typed
    const typedElevation = customLocation
        ? customElevation
        : typeof elevationSelection === 'number' ? elevationSelection : null;
    const groundText = groundElevation === null
        ? t('detail.ground')
        : t('detail.groundAt', { elevation: formatElevation(groundElevation, unitSystem) });
    const elevationButtonText = typedElevation !== null
        ? formatElevation(typedElevation, unitSystem)
        : customLocation ? groundText : elevationPresets.find((preset) => preset.isSelected)?.label;

    const handleCustomElevationSubmit = () => {
        const value = parseInt(customElevationValue, 10);
        if (!isNaN(value) && value >= 0 && value <= maxElevationInput) {
            const meters = elevationFromUnits(value, unitSystem);
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

    // Get model button text: Comparison models shown here / Selected models
    const getModelButtonText = (): string => {
        const counts = { shown: shownModelCount, selected: selectedModelCount };
        if (aggregationCount > 0) {
            return t('detail.modelsButtonWithAggregations', { ...counts, aggregations: aggregationCount });
        }
        return t('detail.modelsButton', counts);
    };

    return (
        <div className="mb-6 flex flex-wrap gap-4 items-center">
            {/* Back Button */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-background border border-theme-border hover:bg-theme-secondary transition-colors"
            >
                <Icon icon={icons.chevronLeft} className="text-theme-textSecondary" />
                <span className="text-sm text-theme-textPrimary">{t('detail.back')}</span>
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
                    <span className="text-sm text-theme-textSecondary">{t('detail.elevationLabel')}</span>
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
                            <span className="text-sm text-theme-textSecondary">{t('detail.elevationLabel')}</span>
                            <span className="text-sm text-theme-textPrimary font-medium">{elevationButtonText}</span>
                            <svg className="w-4 h-4 text-theme-textSecondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showElevationDropdown && (
                            <div className={`absolute ${elevationMenuOpensLeft ? 'right-0' : 'left-0'} z-20 mt-1 w-48 bg-theme-background rounded-lg shadow-lg border border-theme-border p-1`}>
                                {elevationPresets.map((option) => (
                                    <button
                                        key={option.id}
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
                                                const displayValue = metersValue === null ? null : elevationInUnits(metersValue, unitSystem);
                                                setCustomElevationValue(displayValue === null ? '' : displayValue.toString());
                                            }}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${typedElevation !== null
                                                    ? 'bg-theme-secondary text-theme-textPrimary'
                                                    : 'text-theme-textSecondary hover:bg-theme-secondary hover:text-theme-textPrimary'
                                                }`}
                                        >
                                            <span>{t('detail.customElevation')}</span>
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
                                                    placeholder={t('detail.elevation')}
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
                                                    className="flex-1 px-2 py-1 text-xs rounded bg-theme-accent text-theme-background hover:opacity-90"
                                                >
                                                    {t('detail.apply')}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowCustomElevationInput(false);
                                                        setCustomElevationValue('');
                                                    }}
                                                    className="flex-1 px-2 py-1 text-xs rounded bg-theme-secondary text-theme-textSecondary hover:bg-theme-cardBg"
                                                >
                                                    {t('detail.cancel')}
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
                            title={t('detail.forecastAtGround')}
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
                            <span className="text-sm font-medium">{t('detail.resetLocation')}</span>
                        </button>
                    )}
                </>
            )}

            <div className="h-6 w-px bg-theme-border" />

            {/* History, and the days shown: the Forecast horizon, or the History length while History is on.
                Together, so they wrap onto a phone's next line as one */}
            <div className="flex items-center gap-4">
                <HistorySwitch isHistory={isHistory} setIsHistory={setIsHistory} />
                <div className="relative" data-dropdown>
                    <button
                        onClick={() => {
                            setShowForecastDropdown(!showForecastDropdown);
                            setShowElevationDropdown(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-background border border-theme-border hover:bg-theme-secondary transition-colors"
                    >
                        <span className="text-sm text-theme-textSecondary">{isHistory ? t('detail.historyLabel') : t('detail.forecastLabel')}</span>
                        <span className="text-sm text-theme-textPrimary font-medium">
                            {tPlural('detail.days', days)}
                        </span>
                        <svg className="w-4 h-4 text-theme-textSecondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {showForecastDropdown && (
                        <div className="absolute left-0 z-20 mt-1 w-32 bg-theme-background rounded-lg shadow-lg border border-theme-border p-1">
                            {dayChoices.map((choice) => (
                                <button
                                    key={choice}
                                    onClick={() => {
                                        setDays(choice);
                                        setShowForecastDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${days === choice
                                            ? 'bg-theme-secondary text-theme-textPrimary'
                                            : 'text-theme-textSecondary hover:bg-theme-secondary hover:text-theme-textPrimary'
                                        }`}
                                >
                                    {tPlural('detail.days', choice)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="h-6 w-px bg-theme-border" />

            {/* Charts picker button - Opens Modal */}
            <button
                onClick={variableSelection.openModal}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-background border border-theme-border hover:bg-theme-secondary transition-colors"
            >
                <span className="text-sm text-theme-textPrimary">
                    {t('detail.charts', { count: selectedVariables.length })}
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
                title={isChartLocked ? t('detail.unlockCharts') : t('detail.lockCharts')}
            >
                <span className="text-lg">{isChartLocked ? '🔒' : '🔓'}</span>
            </button>

            {/* Variable Selection Modal */}
            <VariableSelectionModal selection={variableSelection} />
        </div>
    );
}

import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { icons } from '../constants/icons';
import { isFullscreenSupported } from '../hooks/useFullscreen';
import { useCardModelsSummary } from '../components/CardModelsModal';
import { useDetailedViewModelsSummary } from '../hooks/useSelectedModels';
import { useShownCharts } from '../hooks/useDetailedViewSettings';
import { useLanguage } from '../hooks/useLanguage';
import type { Theme } from '../types/themes';
import type { Font } from '../types/fonts';
import type { Language, TranslationKey } from '../types/i18n';
import type { ElevationSelection } from '../types/detailView';
import type { MapRotation, MapTilt } from '../utils/mapRotation';
import {
    BASE_MAPS,
    OVERLAYS,
    TERRAIN_COLOURINGS,
    terrainColouring,
    withOverlay,
    withTerrainColouring,
    type MapLayers,
} from '../utils/mapLayers';
import { FORECAST_HORIZONS, HISTORY_LENGTHS } from '../utils/constants';
import { elevationFromUnits, elevationInUnits, formatElevation, maxTypedElevation } from '../utils/unitConversion';
import type {
    ElevationLevel,
    SortOption,
    SortDay,
    SortDayData,
    ViewMode,
    TemperatureMetric,
    SnowfallEstimateMode,
    SnowCaution,
    UtilityBarStyle,
    UnitSystem,
    ResortDisplayLimit,
} from '../types';

export interface SettingsPageProps {
    // Theme
    availableThemes: Theme[];
    setTheme: (id: string) => void;
    currentThemeId: string;
    applyTheme: (theme: Theme) => void;
    resetThemePreview: () => void;
    // Font
    availableFonts: Font[];
    setFont: (id: string) => void;
    currentFontId: string;
    applyFont: (font: Font) => void;
    resetFontPreview: () => void;
    // Display toggles
    isRainbowEnabled: boolean;
    setRainbowEnabled: (enabled: boolean) => void;
    isBoldTextEnabled: boolean;
    setBoldTextEnabled: (enabled: boolean) => void;
    isHideBordersEnabled: boolean;
    setHideBordersEnabled: (enabled: boolean) => void;
    isShowDateEnabled: boolean;
    setShowDateEnabled: (enabled: boolean) => void;
    // Fullscreen
    isFullscreen: boolean;
    enterFullscreen: () => void;
    exitFullscreen: () => void;
    // FPS
    isFPSEnabled: boolean;
    setFPSEnabled: (enabled: boolean) => void;
    // Chart zoom
    chartZoomSyncEnabled: boolean;
    setChartZoomSyncEnabled: (enabled: boolean) => void;
    // Maps
    mapRotation: MapRotation;
    setMapRotation: (rotation: MapRotation) => void;
    mapTilt: MapTilt;
    setMapTilt: (tilt: MapTilt) => void;
    cursorReadoutShown: boolean;
    setCursorReadoutShown: (shown: boolean) => void;
    openSlopeBands: () => void;
    // Detailed view
    openDetailedViewModels: () => void;
    openChartsPicker: () => void;
    detailElevation: ElevationSelection;
    setDetailElevation: (selection: ElevationSelection) => void;
    forecastHorizon: number;
    setForecastHorizon: (days: number) => void;
    isChartLocked: boolean;
    setIsChartLocked: (locked: boolean) => void;
    // Map layers
    mapLayers: MapLayers;
    setMapLayers: (layers: MapLayers) => void;
    // Weather display
    selectedElevation: ElevationLevel;
    setSelectedElevation: (e: ElevationLevel) => void;
    selectedSort: SortOption;
    setSelectedSort: (s: SortOption) => void;
    selectedSortDay: SortDay;
    setSelectedSortDay: (d: SortDay) => void;
    sortDayData: SortDayData;
    isReversed: boolean;
    setIsReversed: (r: boolean) => void;
    viewMode: ViewMode;
    setViewMode: (m: ViewMode) => void;
    // History
    isHistory: boolean;
    setIsHistory: (on: boolean) => void;
    historyLength: number;
    setHistoryLength: (days: number) => void;
    selectedTemperatureMetric: TemperatureMetric;
    setSelectedTemperatureMetric: (m: TemperatureMetric) => void;
    snowfallEstimateMode: SnowfallEstimateMode;
    setSnowfallEstimateMode: (m: SnowfallEstimateMode) => void;
    snowCaution: SnowCaution;
    setSnowCaution: (c: SnowCaution) => void;
    openCardModels: () => void;
    // Utility bar
    showUtilityBar: boolean;
    setShowUtilityBar: (show: boolean) => void;
    utilityBarStyle: UtilityBarStyle;
    setUtilityBarStyle: (style: UtilityBarStyle) => void;
    // Units
    unitSystem: UnitSystem;
    setUnitSystem: (system: UnitSystem) => void;
    // Language
    language: Language;
    setLanguage: (id: string) => void;
    availableLanguages: Language[];
    // Resort display limit
    resortDisplayLimit: ResortDisplayLimit;
    setResortDisplayLimit: (limit: ResortDisplayLimit) => void;
    // Model styles
    openModelStyles: () => void;
    // Resort selector
    openResortSelector: () => void;
}

interface SettingSectionProps {
    title: string;
    icon: typeof icons[keyof typeof icons];
    children: React.ReactNode;
}

function SettingSection({ title, icon, children }: SettingSectionProps): JSX.Element {
    return (
        <section className="settings-section">
            <h4 className="settings-section-title">
                <Icon icon={icon} className="settings-section-icon" />
                {title}
            </h4>
            <div className="settings-section-content">
                {children}
            </div>
        </section>
    );
}

// What a right-drag does on the 3D map with each choice, shown under the choices
const MAP_ROTATION_DESCRIPTIONS: Record<MapRotation, TranslationKey> = {
    linear: 'settings.mapRotation.linear',
    linearReversed: 'settings.mapRotation.linearReversed',
    orbital: 'settings.mapRotation.orbital',
};
const MAP_TILT_DESCRIPTIONS: Record<MapTilt, TranslationKey> = {
    dragUp: 'settings.mapTilt.dragUp',
    dragDown: 'settings.mapTilt.dragDown',
};

// The page's groups, by where their settings take effect, in page order
const SETTING_GROUPS = [
    { id: 'settings-general', title: 'settings.group.general' },
    { id: 'settings-main-page', title: 'settings.group.mainPage' },
    { id: 'settings-detailed-view', title: 'settings.group.detailedView' },
    { id: 'settings-appearance', title: 'settings.group.appearance' },
    { id: 'settings-advanced', title: 'settings.group.advanced' },
] as const satisfies readonly { id: string; title: TranslationKey }[];

type SettingGroupId = typeof SETTING_GROUPS[number]['id'];

interface SettingGroupProps {
    id: SettingGroupId;
    children: React.ReactNode;
}

function SettingGroup({ id, children }: SettingGroupProps): JSX.Element {
    const { t } = useLanguage();
    const title = SETTING_GROUPS.find(g => g.id === id)?.title;
    return (
        <div className="settings-group">
            <h3 id={id} className="settings-group-title">{title && t(title)}</h3>
            {children}
        </div>
    );
}

interface OptionButtonProps {
    label: string;
    isSelected: boolean;
    onClick: () => void;
    icon?: typeof icons[keyof typeof icons];
    onHover?: () => void;
    onHoverEnd?: () => void;
}

function OptionButton({ label, isSelected, onClick, icon, onHover, onHoverEnd }: OptionButtonProps): JSX.Element {
    return (
        <button
            onClick={onClick}
            onMouseEnter={onHover}
            onMouseLeave={onHoverEnd}
            className={`settings-option-btn ${isSelected ? 'selected' : ''}`}
        >
            {icon && <Icon icon={icon} className="settings-option-icon" />}
            <span>{label}</span>
            {isSelected && <Icon icon={icons.check} className="settings-check-icon" />}
        </button>
    );
}

interface ActionButtonProps {
    label: string;
    icon: typeof icons[keyof typeof icons];
    onClick: () => void;
}

// Opens a picker, where an OptionButton sets a value
function ActionButton({ label, icon, onClick }: ActionButtonProps): JSX.Element {
    return (
        <button onClick={onClick} className="settings-action-btn">
            <Icon icon={icon} />
            <span>{label}</span>
        </button>
    );
}

interface ThemePickerProps {
    themes: Theme[];
    currentThemeId: string;
    setTheme: (id: string) => void;
    applyTheme: (theme: Theme) => void;
    resetThemePreview: () => void;
}

// Searchable, scrolling list of themes, each button painted in its own colours
function ThemePicker({ themes, currentThemeId, setTheme, applyTheme, resetThemePreview }: ThemePickerProps): JSX.Element {
    const { t: translate } = useLanguage(); // t is each theme below
    const [query, setQuery] = useState('');
    const listRef = useRef<HTMLDivElement>(null);
    const needle = query.trim().toLowerCase();
    const shownThemes = needle ? themes.filter(t => t.name.toLowerCase().includes(needle)) : themes;

    // Keep the current theme in view (it is restored from storage after the first render)
    useEffect(() => {
        const list = listRef.current;
        const selected = list?.querySelector<HTMLElement>('.selected');
        if (!list || !selected) return;
        const outOfView = selected.offsetTop < list.scrollTop
            || selected.offsetTop + selected.offsetHeight > list.scrollTop + list.clientHeight;
        if (outOfView) {
            list.scrollTop = selected.offsetTop - (list.clientHeight - selected.offsetHeight) / 2;
        }
    }, [currentThemeId]);

    return (
        <>
            <input
                type="text"
                className="settings-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={translate('settings.searchThemes')}
                aria-label={translate('settings.searchThemesLabel')}
                autoComplete="off"
                spellCheck={false}
            />
            <div ref={listRef} className="settings-options-grid settings-theme-list" onMouseLeave={resetThemePreview}>
                {shownThemes.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        onMouseEnter={() => applyTheme(t)}
                        onMouseLeave={resetThemePreview}
                        className={`settings-option-btn ${currentThemeId === t.id ? 'selected' : ''}`}
                        style={{ background: t.colors.background, color: t.colors.accent }}
                        title={t.name}
                    >
                        <span className="settings-option-icon" style={{ color: t.colors.textSecondary }}>
                            <Icon icon={t.isDark ? icons.dark : icons.light} />
                        </span>
                        <span className="settings-theme-name">{t.name}</span>
                        {currentThemeId === t.id && <Icon icon={icons.check} className="settings-check-icon" />}
                    </button>
                ))}
                {shownThemes.length === 0 && <p className="settings-theme-empty">{translate('settings.noThemesMatch', { query: query.trim() })}</p>}
            </div>
        </>
    );
}

interface ToggleProps {
    label: string;
    isEnabled: boolean;
    onToggle: (enabled: boolean) => void;
    icon?: typeof icons[keyof typeof icons];
    /** A few words after the label on what it does, e.g. "no zooming or range slider" */
    hint?: string;
}

function Toggle({ label, isEnabled, onToggle, icon, hint }: ToggleProps): JSX.Element {
    return (
        <button
            onClick={() => onToggle(!isEnabled)}
            className={`settings-toggle ${isEnabled ? 'enabled' : ''}`}
        >
            <div className="settings-toggle-label">
                {icon && <Icon icon={icon} className="settings-toggle-icon" />}
                <span>{label}</span>
                {hint && <span className="settings-toggle-hint">{hint}</span>}
            </div>
            <div className={`settings-toggle-switch ${isEnabled ? 'on' : ''}`}>
                <div className="settings-toggle-knob" />
            </div>
        </button>
    );
}

interface DetailElevationPickerProps {
    selection: ElevationSelection;
    setSelection: (selection: ElevationSelection) => void;
    unitSystem: UnitSystem;
}

const ELEVATION_BANDS: { value: ElevationSelection; label: TranslationKey }[] = [
    { value: 'base', label: 'band.base' },
    { value: 'mid', label: 'band.mid' },
    { value: 'top', label: 'band.top' },
];

// The Detailed view's Elevation: an Elevation band, or a Custom elevation typed in the visitor's units
function DetailElevationPicker({ selection, setSelection, unitSystem }: DetailElevationPickerProps): JSX.Element {
    const { t } = useLanguage();
    const [isTyping, setIsTyping] = useState(false);
    const [typed, setTyped] = useState('');
    const customElevation = typeof selection === 'number' ? selection : null;
    const unit = unitSystem === 'imperial' ? 'ft' : 'm';

    const startTyping = () => {
        setTyped(customElevation === null ? '' : String(elevationInUnits(customElevation, unitSystem)));
        setIsTyping(true);
    };
    const apply = () => {
        const value = parseInt(typed, 10);
        if (!isNaN(value) && value >= 0 && value <= maxTypedElevation(unitSystem)) {
            setSelection(elevationFromUnits(value, unitSystem));
            setIsTyping(false);
        }
    };

    return (
        <>
            <div className="settings-options-row">
                {ELEVATION_BANDS.map(band => (
                    <OptionButton
                        key={String(band.value)}
                        label={t(band.label)}
                        isSelected={selection === band.value}
                        onClick={() => { setSelection(band.value); setIsTyping(false); }}
                    />
                ))}
                <OptionButton
                    label={customElevation === null
                        ? t('settings.customElevation')
                        : t('settings.customElevationValue', { elevation: formatElevation(customElevation, unitSystem) })}
                    isSelected={customElevation !== null}
                    onClick={startTyping}
                />
            </div>
            {isTyping && (
                <div className="settings-options-row">
                    <input
                        type="number"
                        className="settings-search settings-elevation-input"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') apply();
                            else if (e.key === 'Escape') setIsTyping(false);
                        }}
                        min="0"
                        max={maxTypedElevation(unitSystem)}
                        placeholder={t('settings.elevation')}
                        aria-label={t(unitSystem === 'imperial' ? 'settings.customElevationInFeet' : 'settings.customElevationInMetres')}
                        autoFocus
                    />
                    <span className="self-center text-sm text-theme-textSecondary">{unit}</span>
                    <OptionButton label={t('settings.apply')} isSelected={false} onClick={apply} />
                    <OptionButton label={t('settings.cancel')} isSelected={false} onClick={() => setIsTyping(false)} />
                </div>
            )}
            <span className="text-sm text-theme-textSecondary">{t('settings.savedLocationsOwnHeight')}</span>
        </>
    );
}

export function SettingsPage(props: SettingsPageProps): JSX.Element {
    const {
        availableThemes, setTheme, currentThemeId, applyTheme, resetThemePreview,
        availableFonts, setFont, currentFontId, applyFont, resetFontPreview,
        isRainbowEnabled, setRainbowEnabled,
        isBoldTextEnabled, setBoldTextEnabled,
        isHideBordersEnabled, setHideBordersEnabled,
        isShowDateEnabled, setShowDateEnabled,
        isFullscreen, enterFullscreen, exitFullscreen,
        isFPSEnabled, setFPSEnabled,
        chartZoomSyncEnabled, setChartZoomSyncEnabled,
        mapRotation, setMapRotation,
        mapTilt, setMapTilt,
        cursorReadoutShown, setCursorReadoutShown,
        openSlopeBands,
        openDetailedViewModels, openChartsPicker,
        detailElevation, setDetailElevation,
        forecastHorizon, setForecastHorizon,
        isChartLocked, setIsChartLocked,
        mapLayers, setMapLayers,
        selectedElevation, setSelectedElevation,
        selectedSort, setSelectedSort,
        selectedSortDay, setSelectedSortDay, sortDayData,
        isReversed, setIsReversed,
        viewMode, setViewMode,
        isHistory, setIsHistory, historyLength, setHistoryLength,
        selectedTemperatureMetric, setSelectedTemperatureMetric,
        snowfallEstimateMode, setSnowfallEstimateMode,
        snowCaution, setSnowCaution,
        openCardModels,
        showUtilityBar, setShowUtilityBar,
        utilityBarStyle, setUtilityBarStyle,
        unitSystem, setUnitSystem,
        language, setLanguage, availableLanguages,
        resortDisplayLimit, setResortDisplayLimit,
        openModelStyles,
        openResortSelector,
    } = props;
    const { t, tPlural } = useLanguage();
    const cardModelsSummary = useCardModelsSummary();
    const detailedViewModelsSummary = useDetailedViewModelsSummary();
    const [shownCharts] = useShownCharts();
    const colouring = terrainColouring(mapLayers);

    return (
        <div className="settings-page">
            <h2 className="settings-title">{t('settings.title')}</h2>
            <p className="settings-subtitle">{t('settings.tip')}</p>

            <nav className="settings-jump" aria-label={t('settings.groupsLabel')}>
                {SETTING_GROUPS.map(g => (
                    <button
                        key={g.id}
                        type="button"
                        className="settings-option-btn"
                        onClick={() => document.getElementById(g.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    >
                        {t(g.title)}
                    </button>
                ))}
            </nav>

            <div className="settings-grid">
                <SettingGroup id="settings-general">
                    <SettingSection title={t('command.units')} icon={icons.units}>
                        <div className="settings-options-row">
                            <OptionButton
                                label={t('command.units.metric')}
                                isSelected={unitSystem === 'metric'}
                                onClick={() => { setUnitSystem('metric'); window.location.reload(); }}
                            />
                            <OptionButton
                                label={t('command.units.imperial')}
                                isSelected={unitSystem === 'imperial'}
                                onClick={() => { setUnitSystem('imperial'); window.location.reload(); }}
                            />
                        </div>
                    </SettingSection>

                    <SettingSection title={t('language.title')} icon={icons.language}>
                        <div className="settings-options-grid">
                            {availableLanguages.map(lang => (
                                <OptionButton
                                    key={lang.id}
                                    label={lang.nativeName}
                                    isSelected={language.id === lang.id}
                                    onClick={() => setLanguage(lang.id)}
                                />
                            ))}
                        </div>
                    </SettingSection>

                    <SettingSection title={t('command.theme')} icon={icons.theme}>
                        <ThemePicker
                            themes={availableThemes}
                            currentThemeId={currentThemeId}
                            setTheme={setTheme}
                            applyTheme={applyTheme}
                            resetThemePreview={resetThemePreview}
                        />
                    </SettingSection>

                    {/* History is one switch and one History length for the Main page and the Detailed view */}
                    <SettingSection title={t('command.history')} icon={icons.history}>
                        <div className="settings-toggles">
                            <Toggle
                                label={t('command.history')}
                                hint={t('settings.historyHint')}
                                isEnabled={isHistory}
                                onToggle={setIsHistory}
                                icon={icons.history}
                            />
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.historyLength')}</span>
                            <div className="settings-options-row">
                                {HISTORY_LENGTHS.map(days => (
                                    <OptionButton
                                        key={days}
                                        label={tPlural('command.days', days)}
                                        isSelected={historyLength === days}
                                        onClick={() => setHistoryLength(days)}
                                    />
                                ))}
                            </div>
                        </div>
                    </SettingSection>
                </SettingGroup>

                <SettingGroup id="settings-main-page">
                    <SettingSection title={t('settings.section.resorts')} icon={icons.resort}>
                        <ActionButton label={t('command.selectResorts')} icon={icons.resort} onClick={openResortSelector} />
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.resortDisplayLimit')}</span>
                            <div className="settings-options-grid">
                                {([
                                    { value: 'auto' as ResortDisplayLimit, label: t('command.resortDisplayLimit.auto') },
                                    { value: 50 as ResortDisplayLimit, label: '50' },
                                    { value: 100 as ResortDisplayLimit, label: '100' },
                                    { value: 200 as ResortDisplayLimit, label: '200' },
                                    { value: 500 as ResortDisplayLimit, label: '500' },
                                    { value: 0 as ResortDisplayLimit, label: t('command.resortDisplayLimit.none') },
                                ]).map(option => (
                                    <OptionButton
                                        key={String(option.value)}
                                        label={option.label}
                                        isSelected={resortDisplayLimit === option.value}
                                        onClick={() => setResortDisplayLimit(option.value)}
                                    />
                                ))}
                            </div>
                        </div>
                    </SettingSection>

                    <SettingSection title={t('settings.section.cards')} icon={icons.view}>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('settings.viewMode')}</span>
                            <div className="settings-options-row">
                                <OptionButton label={t('command.view.default')} isSelected={viewMode === 'default'} onClick={() => setViewMode('default')} />
                                <OptionButton label={t('command.view.full')} isSelected={viewMode === 'full'} onClick={() => setViewMode('full')} />
                                <OptionButton label={t('command.view.compact')} isSelected={viewMode === 'compact'} onClick={() => setViewMode('compact')} />
                                <OptionButton label={t('command.view.graph')} isSelected={viewMode === 'graph'} onClick={() => setViewMode('graph')} />
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('settings.elevation')}</span>
                            <div className="settings-options-row">
                                <OptionButton label={t('band.base')} isSelected={selectedElevation === 'bot'} onClick={() => setSelectedElevation('bot')} />
                                <OptionButton label={t('band.mid')} isSelected={selectedElevation === 'mid'} onClick={() => setSelectedElevation('mid')} />
                                <OptionButton label={t('band.top')} isSelected={selectedElevation === 'top'} onClick={() => setSelectedElevation('top')} />
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.temperatureDisplay')}</span>
                            <div className="settings-options-row">
                                <OptionButton label={t('settings.temperature.max')} isSelected={selectedTemperatureMetric === 'max'} onClick={() => setSelectedTemperatureMetric('max')} />
                                <OptionButton label={t('settings.temperature.min')} isSelected={selectedTemperatureMetric === 'min'} onClick={() => setSelectedTemperatureMetric('min')} />
                                <OptionButton label={t('settings.temperature.avg')} isSelected={selectedTemperatureMetric === 'avg'} onClick={() => setSelectedTemperatureMetric('avg')} />
                                <OptionButton label={t('settings.temperature.median')} isSelected={selectedTemperatureMetric === 'median'} onClick={() => setSelectedTemperatureMetric('median')} />
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('term.snowfallEstimate')}</span>
                            <div className="settings-options-row">
                                <OptionButton label={t('snowfall.model')} isSelected={snowfallEstimateMode === 'model'} onClick={() => setSnowfallEstimateMode('model')} />
                                <OptionButton label={t('snowfall.monkeysnow')} isSelected={snowfallEstimateMode === 'totalPrecip'} onClick={() => setSnowfallEstimateMode('totalPrecip')} />
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('term.snowCaution')}</span>
                            <div className="settings-options-row">
                                <OptionButton label={t('snowCaution.extraCautious')} isSelected={snowCaution === 'extraCautious'} onClick={() => setSnowCaution('extraCautious')} />
                                <OptionButton label={t('snowCaution.cautious')} isSelected={snowCaution === 'cautious'} onClick={() => setSnowCaution('cautious')} />
                                <OptionButton label={t('snowCaution.realistic')} isSelected={snowCaution === 'realistic'} onClick={() => setSnowCaution('realistic')} />
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.mainPageModels')}</span>
                            <div className="settings-options-row">
                                <ActionButton label={t('settings.choose')} icon={icons.weatherModel} onClick={openCardModels} />
                                <span className="self-center text-sm text-theme-textSecondary">{cardModelsSummary}</span>
                            </div>
                        </div>
                        <div className="settings-toggles">
                            <Toggle
                                label={t('command.showDate')}
                                isEnabled={isShowDateEnabled}
                                onToggle={setShowDateEnabled}
                                icon={icons.date}
                            />
                        </div>
                    </SettingSection>

                    <SettingSection title={t('settings.section.sorting')} icon={icons.sort}>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.sortBy')}</span>
                            <div className="settings-options-row">
                                <OptionButton label={t('settings.sortBy.temperature')} isSelected={selectedSort === 'temperature'} onClick={() => setSelectedSort('temperature')} />
                                <OptionButton label={t('settings.sortBy.snowfall')} isSelected={selectedSort === 'snowfall'} onClick={() => setSelectedSort('snowfall')} />
                                <OptionButton label={t('settings.sortBy.wind')} isSelected={selectedSort === 'wind'} onClick={() => setSelectedSort('wind')} />
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.sortDay')}</span>
                            <div className="settings-options-grid">
                                {sortDayData.specialOptions.map(option => (
                                    <OptionButton
                                        key={option.value}
                                        label={option.name}
                                        isSelected={selectedSortDay === option.value}
                                        onClick={() => setSelectedSortDay(option.value as SortDay)}
                                    />
                                ))}
                                {sortDayData.regularDays.map((label, index) => (
                                    <OptionButton
                                        key={index}
                                        label={label}
                                        isSelected={selectedSortDay === index}
                                        onClick={() => setSelectedSortDay(index)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.sortOrder')}</span>
                            <div className="settings-options-row">
                                <OptionButton label={t('settings.sortOrder.normal')} isSelected={!isReversed} onClick={() => setIsReversed(false)} />
                                <OptionButton label={t('settings.sortOrder.reverse')} isSelected={isReversed} onClick={() => setIsReversed(true)} />
                            </div>
                        </div>
                    </SettingSection>
                </SettingGroup>

                <SettingGroup id="settings-detailed-view">
                    <SettingSection title={t('settings.section.forecast')} icon={icons.weatherModel}>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.detailedViewModels')}</span>
                            <div className="settings-options-row">
                                <ActionButton label={t('settings.choose')} icon={icons.weatherModel} onClick={openDetailedViewModels} />
                                <span className="self-center text-sm text-theme-textSecondary">{detailedViewModelsSummary}</span>
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('settings.elevation')}</span>
                            <DetailElevationPicker selection={detailElevation} setSelection={setDetailElevation} unitSystem={unitSystem} />
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.forecastHorizon')}</span>
                            <div className="settings-options-row">
                                {FORECAST_HORIZONS.map(days => (
                                    <OptionButton
                                        key={days}
                                        label={tPlural('command.days', days)}
                                        isSelected={forecastHorizon === days}
                                        onClick={() => setForecastHorizon(days)}
                                    />
                                ))}
                            </div>
                        </div>
                    </SettingSection>

                    <SettingSection title={t('settings.section.charts')} icon={icons.lineChart}>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('settings.chartsShown')}</span>
                            <div className="settings-options-row">
                                <ActionButton label={t('settings.choose')} icon={icons.lineChart} onClick={openChartsPicker} />
                                <span className="self-center text-sm text-theme-textSecondary">
                                    {tPlural('settings.charts', shownCharts.length)}
                                </span>
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.modelStyles')}</span>
                            <div className="settings-options-row">
                                <ActionButton label={t('settings.edit')} icon={icons.chart} onClick={openModelStyles} />
                                <span className="self-center text-sm text-theme-textSecondary">{t('settings.modelStylesHint')}</span>
                            </div>
                        </div>
                        <div className="settings-toggles">
                            <Toggle
                                label={t('command.syncCharts')}
                                isEnabled={chartZoomSyncEnabled}
                                onToggle={setChartZoomSyncEnabled}
                                icon={icons.link}
                            />
                            <Toggle
                                label={t('command.lockCharts')}
                                hint={t('settings.lockChartsHint')}
                                isEnabled={isChartLocked}
                                onToggle={setIsChartLocked}
                                icon={icons.lock}
                            />
                        </div>
                    </SettingSection>

                    <SettingSection title={t('settings.section.map')} icon={icons.mountain}>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.baseMap')}</span>
                            <div className="settings-options-row">
                                {BASE_MAPS.map(base => (
                                    <OptionButton
                                        key={base.id}
                                        label={base.label}
                                        isSelected={mapLayers.baseMap === base.id}
                                        onClick={() => setMapLayers({ ...mapLayers, baseMap: base.id })}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('settings.overlays')}</span>
                            <div className="settings-toggles">
                                {OVERLAYS.map(overlay => (
                                    <Toggle
                                        key={overlay.id}
                                        label={overlay.label}
                                        // The 3D map always shades its terrain
                                        hint={overlay.id === 'hillshade' ? t('settings.hillshadeHint') : undefined}
                                        isEnabled={mapLayers.overlays.includes(overlay.id)}
                                        onToggle={(on) => setMapLayers(withOverlay(mapLayers, overlay.id, on))}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.colourTerrainBy')}</span>
                            <div className="settings-options-row">
                                {[{ id: null, label: t('command.colourTerrainBy.none') }, ...TERRAIN_COLOURINGS].map(option => (
                                    <OptionButton
                                        key={option.id ?? 'none'}
                                        label={option.label}
                                        isSelected={colouring === option.id}
                                        onClick={() => setMapLayers(withTerrainColouring(mapLayers, option.id))}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.slopeBands')}</span>
                            <div className="settings-options-row">
                                <ActionButton label={t('settings.edit')} icon={icons.slopeBands} onClick={openSlopeBands} />
                                <span className="self-center text-sm text-theme-textSecondary">{t('settings.slopeBandsHint')}</span>
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.mapRotation')}</span>
                            <div className="settings-options-row">
                                <OptionButton label={t('command.mapRotation.linear')} isSelected={mapRotation === 'linear'} onClick={() => setMapRotation('linear')} />
                                <OptionButton label={t('command.mapRotation.linearReversed')} isSelected={mapRotation === 'linearReversed'} onClick={() => setMapRotation('linearReversed')} />
                                <OptionButton label={t('command.mapRotation.orbital')} isSelected={mapRotation === 'orbital'} onClick={() => setMapRotation('orbital')} />
                            </div>
                            <span className="text-sm text-theme-textSecondary">{t(MAP_ROTATION_DESCRIPTIONS[mapRotation])}</span>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.mapTilt')}</span>
                            <div className="settings-options-row">
                                <OptionButton label={t('command.mapTilt.dragUp')} isSelected={mapTilt === 'dragUp'} onClick={() => setMapTilt('dragUp')} />
                                <OptionButton label={t('command.mapTilt.dragDown')} isSelected={mapTilt === 'dragDown'} onClick={() => setMapTilt('dragDown')} />
                            </div>
                            <span className="text-sm text-theme-textSecondary">{t(MAP_TILT_DESCRIPTIONS[mapTilt])}</span>
                        </div>
                        <div className="settings-subsection">
                            <div className="settings-toggles">
                                <Toggle
                                    label={t('command.cursorReadout')}
                                    isEnabled={cursorReadoutShown}
                                    onToggle={setCursorReadoutShown}
                                    icon={icons.cursor}
                                />
                            </div>
                            <span className="text-sm text-theme-textSecondary">{t('settings.cursorReadoutHint')}</span>
                        </div>
                    </SettingSection>
                </SettingGroup>

                <SettingGroup id="settings-appearance">
                    <SettingSection title={t('command.font')} icon={icons.font}>
                        <div className="settings-options-grid" onMouseLeave={resetFontPreview}>
                            {availableFonts.map(f => (
                                <OptionButton
                                    key={f.id}
                                    label={f.name}
                                    isSelected={currentFontId === f.id}
                                    onClick={() => setFont(f.id)}
                                    icon={f.isMonospace ? icons.monospace : icons.regular}
                                    onHover={() => applyFont(f)}
                                    onHoverEnd={resetFontPreview}
                                />
                            ))}
                        </div>
                        <div className="settings-toggles">
                            <Toggle
                                label={t('command.boldText')}
                                isEnabled={isBoldTextEnabled}
                                onToggle={setBoldTextEnabled}
                                icon={icons.bold}
                            />
                            <Toggle
                                label={t('command.rainbowText')}
                                isEnabled={isRainbowEnabled}
                                onToggle={setRainbowEnabled}
                                icon={icons.rainbow}
                            />
                        </div>
                    </SettingSection>

                    <SettingSection title={t('settings.section.interface')} icon={icons.controls}>
                        <div className="settings-toggles">
                            <Toggle
                                label={t('settings.showUtilityBar')}
                                isEnabled={showUtilityBar}
                                onToggle={setShowUtilityBar}
                            />
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">{t('command.utilityBarStyle')}</span>
                            <div className="settings-options-row">
                                <OptionButton label={t('command.utilityBarStyle.compact')} isSelected={utilityBarStyle === 'compact'} onClick={() => setUtilityBarStyle('compact')} />
                                <OptionButton label={t('command.utilityBarStyle.large')} isSelected={utilityBarStyle === 'large'} onClick={() => setUtilityBarStyle('large')} />
                            </div>
                        </div>
                        <div className="settings-toggles">
                            <Toggle
                                label={t('command.showBorders')}
                                isEnabled={!isHideBordersEnabled}
                                onToggle={(enabled) => setHideBordersEnabled(!enabled)}
                                icon={icons.borders}
                            />
                            {/* Not offered where the page can't go fullscreen (iPhone) */}
                            {isFullscreenSupported && (
                                <Toggle
                                    label={t('command.fullscreen')}
                                    isEnabled={isFullscreen}
                                    onToggle={(enabled) => enabled ? enterFullscreen() : exitFullscreen()}
                                    icon={icons.fullscreen}
                                />
                            )}
                        </div>
                    </SettingSection>
                </SettingGroup>

                <SettingGroup id="settings-advanced">
                    <SettingSection title={t('settings.section.performance')} icon={icons.fps}>
                        <div className="settings-toggles">
                            <Toggle
                                label={t('command.fpsCounter')}
                                isEnabled={isFPSEnabled}
                                onToggle={setFPSEnabled}
                                icon={icons.fps}
                            />
                        </div>
                    </SettingSection>
                </SettingGroup>
            </div>
        </div>
    );
}

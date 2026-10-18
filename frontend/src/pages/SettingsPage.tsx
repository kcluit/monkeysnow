import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { icons } from '../constants/icons';
import { isFullscreenSupported } from '../hooks/useFullscreen';
import { useCardModelsSummary } from '../components/CardModelsModal';
import { useDetailedViewModelsSummary } from '../hooks/useSelectedModels';
import { useShownCharts } from '../hooks/useDetailedViewSettings';
import type { Theme } from '../types/themes';
import type { Font } from '../types/fonts';
import type { Language } from '../types/i18n';
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
const MAP_ROTATION_DESCRIPTIONS: Record<MapRotation, string> = {
    linear: 'Right-dragging sideways turns your view that way, wherever the pointer is',
    linearReversed: 'Right-dragging sideways turns your view the other way, so the far mountains follow the pointer, wherever it is',
    orbital: 'Right-dragging turns the map like spinning a globe, so opposite ways above and below its middle',
};
const MAP_TILT_DESCRIPTIONS: Record<MapTilt, string> = {
    dragUp: 'Right-dragging up tilts the view toward the horizon',
    dragDown: 'Right-dragging down tilts the view toward the horizon',
};

// The page's groups, by where their settings take effect, in page order
const SETTING_GROUPS = [
    { id: 'settings-general', title: 'General' },
    { id: 'settings-main-page', title: 'Main page' },
    { id: 'settings-detailed-view', title: 'Detailed view' },
    { id: 'settings-appearance', title: 'Appearance' },
    { id: 'settings-advanced', title: 'Advanced' },
] as const;

type SettingGroupId = typeof SETTING_GROUPS[number]['id'];

interface SettingGroupProps {
    id: SettingGroupId;
    children: React.ReactNode;
}

function SettingGroup({ id, children }: SettingGroupProps): JSX.Element {
    const title = SETTING_GROUPS.find(g => g.id === id)?.title;
    return (
        <div className="settings-group">
            <h3 id={id} className="settings-group-title">{title}</h3>
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
                placeholder="Search themes..."
                aria-label="Search themes"
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
                {shownThemes.length === 0 && <p className="settings-theme-empty">No themes match "{query.trim()}"</p>}
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

const ELEVATION_BANDS: { value: ElevationSelection; label: string }[] = [
    { value: 'base', label: 'Base' },
    { value: 'mid', label: 'Mid' },
    { value: 'top', label: 'Top' },
];

// The Detailed view's Elevation: an Elevation band, or a Custom elevation typed in the visitor's units
function DetailElevationPicker({ selection, setSelection, unitSystem }: DetailElevationPickerProps): JSX.Element {
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
                        label={band.label}
                        isSelected={selection === band.value}
                        onClick={() => { setSelection(band.value); setIsTyping(false); }}
                    />
                ))}
                <OptionButton
                    label={customElevation === null ? 'Custom…' : `Custom: ${formatElevation(customElevation, unitSystem)}`}
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
                        placeholder="Elevation"
                        aria-label={`Custom elevation in ${unitSystem === 'imperial' ? 'feet' : 'metres'}`}
                        autoFocus
                    />
                    <span className="self-center text-sm text-theme-textSecondary">{unit}</span>
                    <OptionButton label="Apply" isSelected={false} onClick={apply} />
                    <OptionButton label="Cancel" isSelected={false} onClick={() => setIsTyping(false)} />
                </div>
            )}
            <span className="text-sm text-theme-textSecondary">Saved locations are always forecast at their own height</span>
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
        openCardModels,
        showUtilityBar, setShowUtilityBar,
        utilityBarStyle, setUtilityBarStyle,
        unitSystem, setUnitSystem,
        language, setLanguage, availableLanguages,
        resortDisplayLimit, setResortDisplayLimit,
        openModelStyles,
        openResortSelector,
    } = props;
    const cardModelsSummary = useCardModelsSummary();
    const detailedViewModelsSummary = useDetailedViewModelsSummary();
    const [shownCharts] = useShownCharts();
    const colouring = terrainColouring(mapLayers);

    return (
        <div className="settings-page">
            <h2 className="settings-title">Settings</h2>
            <p className="settings-subtitle">Tip: You can also change all these settings quickly using the command palette (Esc or Tab or Ctrl+Shift+P)</p>

            <nav className="settings-jump" aria-label="Settings groups">
                {SETTING_GROUPS.map(g => (
                    <button
                        key={g.id}
                        type="button"
                        className="settings-option-btn"
                        onClick={() => document.getElementById(g.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    >
                        {g.title}
                    </button>
                ))}
            </nav>

            <div className="settings-grid">
                <SettingGroup id="settings-general">
                    <SettingSection title="Units" icon={icons.units}>
                        <div className="settings-options-row">
                            <OptionButton
                                label="Metric (°C, cm, km/h)"
                                isSelected={unitSystem === 'metric'}
                                onClick={() => { setUnitSystem('metric'); window.location.reload(); }}
                            />
                            <OptionButton
                                label="Imperial (°F, in, mph)"
                                isSelected={unitSystem === 'imperial'}
                                onClick={() => { setUnitSystem('imperial'); window.location.reload(); }}
                            />
                        </div>
                    </SettingSection>

                    <SettingSection title="Language" icon={icons.language}>
                        <div className="settings-options-grid">
                            {availableLanguages.map(lang => (
                                <OptionButton
                                    key={lang.id}
                                    label={lang.name === lang.nativeName ? lang.name : `${lang.name} (${lang.nativeName})`}
                                    isSelected={language.id === lang.id}
                                    onClick={() => setLanguage(lang.id)}
                                />
                            ))}
                        </div>
                    </SettingSection>

                    <SettingSection title="Theme" icon={icons.theme}>
                        <ThemePicker
                            themes={availableThemes}
                            currentThemeId={currentThemeId}
                            setTheme={setTheme}
                            applyTheme={applyTheme}
                            resetThemePreview={resetThemePreview}
                        />
                    </SettingSection>
                </SettingGroup>

                <SettingGroup id="settings-main-page">
                    <SettingSection title="Resorts" icon={icons.resort}>
                        <ActionButton label="Select resorts" icon={icons.resort} onClick={openResortSelector} />
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Resort display limit</span>
                            <div className="settings-options-grid">
                                {([
                                    { value: 'auto' as ResortDisplayLimit, label: 'Auto (100 on mobile)' },
                                    { value: 50 as ResortDisplayLimit, label: '50' },
                                    { value: 100 as ResortDisplayLimit, label: '100' },
                                    { value: 200 as ResortDisplayLimit, label: '200' },
                                    { value: 500 as ResortDisplayLimit, label: '500' },
                                    { value: 0 as ResortDisplayLimit, label: 'No limit' },
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

                    <SettingSection title="Cards" icon={icons.view}>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">View mode</span>
                            <div className="settings-options-row">
                                <OptionButton label="Default" isSelected={viewMode === 'default'} onClick={() => setViewMode('default')} />
                                <OptionButton label="Full" isSelected={viewMode === 'full'} onClick={() => setViewMode('full')} />
                                <OptionButton label="Compact" isSelected={viewMode === 'compact'} onClick={() => setViewMode('compact')} />
                                <OptionButton label="Graph" isSelected={viewMode === 'graph'} onClick={() => setViewMode('graph')} />
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Elevation</span>
                            <div className="settings-options-row">
                                <OptionButton label="Base" isSelected={selectedElevation === 'bot'} onClick={() => setSelectedElevation('bot')} />
                                <OptionButton label="Mid" isSelected={selectedElevation === 'mid'} onClick={() => setSelectedElevation('mid')} />
                                <OptionButton label="Top" isSelected={selectedElevation === 'top'} onClick={() => setSelectedElevation('top')} />
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Temperature display</span>
                            <div className="settings-options-row">
                                <OptionButton label="Max" isSelected={selectedTemperatureMetric === 'max'} onClick={() => setSelectedTemperatureMetric('max')} />
                                <OptionButton label="Min" isSelected={selectedTemperatureMetric === 'min'} onClick={() => setSelectedTemperatureMetric('min')} />
                                <OptionButton label="Avg" isSelected={selectedTemperatureMetric === 'avg'} onClick={() => setSelectedTemperatureMetric('avg')} />
                                <OptionButton label="Median" isSelected={selectedTemperatureMetric === 'median'} onClick={() => setSelectedTemperatureMetric('median')} />
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Snowfall estimate</span>
                            <div className="settings-options-row">
                                <OptionButton label="Model estimate" isSelected={snowfallEstimateMode === 'model'} onClick={() => setSnowfallEstimateMode('model')} />
                                <OptionButton label="monkeysnow estimate" isSelected={snowfallEstimateMode === 'totalPrecip'} onClick={() => setSnowfallEstimateMode('totalPrecip')} />
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Main page models</span>
                            <div className="settings-options-row">
                                <ActionButton label="Choose…" icon={icons.weatherModel} onClick={openCardModels} />
                                <span className="self-center text-sm text-theme-textSecondary">{cardModelsSummary}</span>
                            </div>
                        </div>
                        <div className="settings-toggles">
                            <Toggle
                                label="Show date"
                                isEnabled={isShowDateEnabled}
                                onToggle={setShowDateEnabled}
                                icon={icons.date}
                            />
                        </div>
                    </SettingSection>

                    <SettingSection title="History" icon={icons.history}>
                        <div className="settings-toggles">
                            <Toggle
                                label="History"
                                hint="the past days instead of the forecast, until you leave"
                                isEnabled={isHistory}
                                onToggle={setIsHistory}
                                icon={icons.history}
                            />
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">History length</span>
                            <div className="settings-options-row">
                                {HISTORY_LENGTHS.map(days => (
                                    <OptionButton
                                        key={days}
                                        label={`${days} days`}
                                        isSelected={historyLength === days}
                                        onClick={() => setHistoryLength(days)}
                                    />
                                ))}
                            </div>
                        </div>
                    </SettingSection>

                    <SettingSection title="Sorting" icon={icons.sort}>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Sort by</span>
                            <div className="settings-options-row">
                                <OptionButton label="Temperature" isSelected={selectedSort === 'temperature'} onClick={() => setSelectedSort('temperature')} />
                                <OptionButton label="Snowfall" isSelected={selectedSort === 'snowfall'} onClick={() => setSelectedSort('snowfall')} />
                                <OptionButton label="Wind" isSelected={selectedSort === 'wind'} onClick={() => setSelectedSort('wind')} />
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Sort day</span>
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
                            <span className="settings-subsection-label">Sort order</span>
                            <div className="settings-options-row">
                                <OptionButton label="Normal" isSelected={!isReversed} onClick={() => setIsReversed(false)} />
                                <OptionButton label="Reverse" isSelected={isReversed} onClick={() => setIsReversed(true)} />
                            </div>
                        </div>
                    </SettingSection>
                </SettingGroup>

                <SettingGroup id="settings-detailed-view">
                    <SettingSection title="Forecast" icon={icons.weatherModel}>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Detailed view models</span>
                            <div className="settings-options-row">
                                <ActionButton label="Choose…" icon={icons.weatherModel} onClick={openDetailedViewModels} />
                                <span className="self-center text-sm text-theme-textSecondary">{detailedViewModelsSummary}</span>
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Elevation</span>
                            <DetailElevationPicker selection={detailElevation} setSelection={setDetailElevation} unitSystem={unitSystem} />
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Forecast horizon</span>
                            <div className="settings-options-row">
                                {FORECAST_HORIZONS.map(days => (
                                    <OptionButton
                                        key={days}
                                        label={days === 1 ? '1 day' : `${days} days`}
                                        isSelected={forecastHorizon === days}
                                        onClick={() => setForecastHorizon(days)}
                                    />
                                ))}
                            </div>
                        </div>
                    </SettingSection>

                    <SettingSection title="Charts" icon={icons.lineChart}>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Charts shown</span>
                            <div className="settings-options-row">
                                <ActionButton label="Choose…" icon={icons.lineChart} onClick={openChartsPicker} />
                                <span className="self-center text-sm text-theme-textSecondary">
                                    {shownCharts.length === 1 ? '1 chart' : `${shownCharts.length} charts`}
                                </span>
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Model styles</span>
                            <div className="settings-options-row">
                                <ActionButton label="Edit…" icon={icons.chart} onClick={openModelStyles} />
                                <span className="self-center text-sm text-theme-textSecondary">Colours, bold and opacity of each model's chart lines</span>
                            </div>
                        </div>
                        <div className="settings-toggles">
                            <Toggle
                                label="Sync charts"
                                isEnabled={chartZoomSyncEnabled}
                                onToggle={setChartZoomSyncEnabled}
                                icon={icons.link}
                            />
                            <Toggle
                                label="Lock charts"
                                hint="no zooming or range slider"
                                isEnabled={isChartLocked}
                                onToggle={setIsChartLocked}
                                icon={icons.lock}
                            />
                        </div>
                    </SettingSection>

                    <SettingSection title="Map" icon={icons.mountain}>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Base map</span>
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
                            <span className="settings-subsection-label">Overlays</span>
                            <div className="settings-toggles">
                                {OVERLAYS.map(overlay => (
                                    <Toggle
                                        key={overlay.id}
                                        label={overlay.label}
                                        // The 3D map always shades its terrain
                                        hint={overlay.id === 'hillshade' ? 'always on in 3D' : undefined}
                                        isEnabled={mapLayers.overlays.includes(overlay.id)}
                                        onToggle={(on) => setMapLayers(withOverlay(mapLayers, overlay.id, on))}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Colour terrain by</span>
                            <div className="settings-options-row">
                                {[{ id: null, label: 'None' }, ...TERRAIN_COLOURINGS].map(option => (
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
                            <span className="settings-subsection-label">Slope bands</span>
                            <div className="settings-options-row">
                                <ActionButton label="Edit…" icon={icons.slopeBands} onClick={openSlopeBands} />
                                <span className="self-center text-sm text-theme-textSecondary">The ranges of steepness the Slope angle colouring paints, and their colours</span>
                            </div>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">3D map rotation</span>
                            <div className="settings-options-row">
                                <OptionButton label="Linear" isSelected={mapRotation === 'linear'} onClick={() => setMapRotation('linear')} />
                                <OptionButton label="Linear reversed" isSelected={mapRotation === 'linearReversed'} onClick={() => setMapRotation('linearReversed')} />
                                <OptionButton label="Orbital" isSelected={mapRotation === 'orbital'} onClick={() => setMapRotation('orbital')} />
                            </div>
                            <span className="text-sm text-theme-textSecondary">{MAP_ROTATION_DESCRIPTIONS[mapRotation]}</span>
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">3D map tilt</span>
                            <div className="settings-options-row">
                                <OptionButton label="Drag up" isSelected={mapTilt === 'dragUp'} onClick={() => setMapTilt('dragUp')} />
                                <OptionButton label="Drag down" isSelected={mapTilt === 'dragDown'} onClick={() => setMapTilt('dragDown')} />
                            </div>
                            <span className="text-sm text-theme-textSecondary">{MAP_TILT_DESCRIPTIONS[mapTilt]}</span>
                        </div>
                        <div className="settings-subsection">
                            <div className="settings-toggles">
                                <Toggle
                                    label="Cursor readout"
                                    isEnabled={cursorReadoutShown}
                                    onToggle={setCursorReadoutShown}
                                    icon={icons.cursor}
                                />
                            </div>
                            <span className="text-sm text-theme-textSecondary">The height, Slope angle and Aspect of the terrain under the mouse, in a corner of either map; only where there is a mouse</span>
                        </div>
                    </SettingSection>
                </SettingGroup>

                <SettingGroup id="settings-appearance">
                    <SettingSection title="Font" icon={icons.font}>
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
                                label="Bold text"
                                isEnabled={isBoldTextEnabled}
                                onToggle={setBoldTextEnabled}
                                icon={icons.bold}
                            />
                            <Toggle
                                label="Rainbow text"
                                isEnabled={isRainbowEnabled}
                                onToggle={setRainbowEnabled}
                                icon={icons.rainbow}
                            />
                        </div>
                    </SettingSection>

                    <SettingSection title="Interface" icon={icons.controls}>
                        <div className="settings-toggles">
                            <Toggle
                                label="Show utility bar"
                                isEnabled={showUtilityBar}
                                onToggle={setShowUtilityBar}
                            />
                        </div>
                        <div className="settings-subsection">
                            <span className="settings-subsection-label">Utility bar style</span>
                            <div className="settings-options-row">
                                <OptionButton label="Compact" isSelected={utilityBarStyle === 'compact'} onClick={() => setUtilityBarStyle('compact')} />
                                <OptionButton label="Large" isSelected={utilityBarStyle === 'large'} onClick={() => setUtilityBarStyle('large')} />
                            </div>
                        </div>
                        <div className="settings-toggles">
                            <Toggle
                                label="Show borders"
                                isEnabled={!isHideBordersEnabled}
                                onToggle={(enabled) => setHideBordersEnabled(!enabled)}
                                icon={icons.borders}
                            />
                            {/* Not offered where the page can't go fullscreen (iPhone) */}
                            {isFullscreenSupported && (
                                <Toggle
                                    label="Fullscreen"
                                    isEnabled={isFullscreen}
                                    onToggle={(enabled) => enabled ? enterFullscreen() : exitFullscreen()}
                                    icon={icons.fullscreen}
                                />
                            )}
                        </div>
                    </SettingSection>
                </SettingGroup>

                <SettingGroup id="settings-advanced">
                    <SettingSection title="Performance" icon={icons.fps}>
                        <div className="settings-toggles">
                            <Toggle
                                label="FPS counter"
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

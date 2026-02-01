import { Icon } from '../components/Icon';
import { icons } from '../constants/icons';
import type { Theme } from '../types/themes';
import type { Font } from '../types/fonts';
import type { Language } from '../types/i18n';
import type {
    ElevationLevel,
    SortOption,
    ViewMode,
    TemperatureMetric,
    SnowfallEstimateMode,
    UtilityBarStyle,
    UnitSystem,
} from '../types';

export interface SettingsPageProps {
    // Theme
    availableThemes: Theme[];
    setTheme: (id: string) => void;
    currentThemeId: string;
    // Font
    availableFonts: Font[];
    setFont: (id: string) => void;
    currentFontId: string;
    // Display toggles
    isRainbowEnabled: boolean;
    setRainbowEnabled: (enabled: boolean) => void;
    isHideIconsEnabled: boolean;
    setHideIconsEnabled: (enabled: boolean) => void;
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
    // Weather display
    selectedElevation: ElevationLevel;
    setSelectedElevation: (e: ElevationLevel) => void;
    selectedSort: SortOption;
    setSelectedSort: (s: SortOption) => void;
    viewMode: ViewMode;
    setViewMode: (m: ViewMode) => void;
    selectedTemperatureMetric: TemperatureMetric;
    setSelectedTemperatureMetric: (m: TemperatureMetric) => void;
    snowfallEstimateMode: SnowfallEstimateMode;
    setSnowfallEstimateMode: (m: SnowfallEstimateMode) => void;
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
            <h3 className="settings-section-title">
                <Icon icon={icon} className="settings-section-icon" />
                {title}
            </h3>
            <div className="settings-section-content">
                {children}
            </div>
        </section>
    );
}

interface OptionButtonProps {
    label: string;
    isSelected: boolean;
    onClick: () => void;
    icon?: typeof icons[keyof typeof icons];
}

function OptionButton({ label, isSelected, onClick, icon }: OptionButtonProps): JSX.Element {
    return (
        <button
            onClick={onClick}
            className={`settings-option-btn ${isSelected ? 'selected' : ''}`}
        >
            {icon && <Icon icon={icon} className="settings-option-icon" />}
            <span>{label}</span>
            {isSelected && <Icon icon={icons.check} className="settings-check-icon" />}
        </button>
    );
}

interface ToggleProps {
    label: string;
    isEnabled: boolean;
    onToggle: (enabled: boolean) => void;
    icon?: typeof icons[keyof typeof icons];
}

function Toggle({ label, isEnabled, onToggle, icon }: ToggleProps): JSX.Element {
    return (
        <button
            onClick={() => onToggle(!isEnabled)}
            className={`settings-toggle ${isEnabled ? 'enabled' : ''}`}
        >
            <div className="settings-toggle-label">
                {icon && <Icon icon={icon} className="settings-toggle-icon" />}
                <span>{label}</span>
            </div>
            <div className={`settings-toggle-switch ${isEnabled ? 'on' : ''}`}>
                <div className="settings-toggle-knob" />
            </div>
        </button>
    );
}

export function SettingsPage(props: SettingsPageProps): JSX.Element {
    const {
        availableThemes, setTheme, currentThemeId,
        availableFonts, setFont, currentFontId,
        isRainbowEnabled, setRainbowEnabled,
        isHideIconsEnabled, setHideIconsEnabled,
        isHideBordersEnabled, setHideBordersEnabled,
        isShowDateEnabled, setShowDateEnabled,
        isFullscreen, enterFullscreen, exitFullscreen,
        isFPSEnabled, setFPSEnabled,
        chartZoomSyncEnabled, setChartZoomSyncEnabled,
        selectedElevation, setSelectedElevation,
        selectedSort, setSelectedSort,
        viewMode, setViewMode,
        selectedTemperatureMetric, setSelectedTemperatureMetric,
        snowfallEstimateMode, setSnowfallEstimateMode,
        showUtilityBar, setShowUtilityBar,
        utilityBarStyle, setUtilityBarStyle,
        unitSystem, setUnitSystem,
        language, setLanguage, availableLanguages,
        openResortSelector,
    } = props;

    return (
        <div className="settings-page">
            <h2 className="settings-title">Settings</h2>
            <p className="settings-subtitle">Tip: You can also change all these settings quickly using the commmand palette (Esc or Tab or Ctrl+Shift+P)</p>

            <div className="settings-grid">
                {/* Units & Language */}
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

                {/* Appearance Section */}
                <SettingSection title="Theme" icon={icons.theme}>
                    <div className="settings-options-grid">
                        {availableThemes.map(t => (
                            <OptionButton
                                key={t.id}
                                label={t.name}
                                isSelected={currentThemeId === t.id}
                                onClick={() => setTheme(t.id)}
                                icon={t.isDark ? icons.dark : icons.light}
                            />
                        ))}
                    </div>
                </SettingSection>

                <SettingSection title="Font" icon={icons.font}>
                    <div className="settings-options-grid">
                        {availableFonts.map(f => (
                            <OptionButton
                                key={f.id}
                                label={f.name}
                                isSelected={currentFontId === f.id}
                                onClick={() => setFont(f.id)}
                                icon={f.isMonospace ? icons.monospace : icons.regular}
                            />
                        ))}
                    </div>
                </SettingSection>

                {/* Display Toggles */}
                <SettingSection title="Display" icon={icons.view}>
                    <div className="settings-toggles">
                        <Toggle
                            label="Rainbow text"
                            isEnabled={isRainbowEnabled}
                            onToggle={setRainbowEnabled}
                            icon={icons.rainbow}
                        />
                        <Toggle
                            label="Hide icons"
                            isEnabled={isHideIconsEnabled}
                            onToggle={setHideIconsEnabled}
                            icon={icons.hideIcons}
                        />
                        <Toggle
                            label="Show borders"
                            isEnabled={!isHideBordersEnabled}
                            onToggle={(enabled) => setHideBordersEnabled(!enabled)}
                            icon={icons.borders}
                        />
                        <Toggle
                            label="Show date"
                            isEnabled={isShowDateEnabled}
                            onToggle={setShowDateEnabled}
                            icon={icons.date}
                        />
                        <Toggle
                            label="Fullscreen"
                            isEnabled={isFullscreen}
                            onToggle={(enabled) => enabled ? enterFullscreen() : exitFullscreen()}
                            icon={icons.fullscreen}
                        />
                    </div>
                </SettingSection>

                {/* Weather Display */}
                <SettingSection title="Weather Display" icon={icons.temperature}>
                    <div className="settings-subsection">
                        <span className="settings-subsection-label">Elevation</span>
                        <div className="settings-options-row">
                            <OptionButton label="Base" isSelected={selectedElevation === 'bot'} onClick={() => setSelectedElevation('bot')} />
                            <OptionButton label="Mid" isSelected={selectedElevation === 'mid'} onClick={() => setSelectedElevation('mid')} />
                            <OptionButton label="Peak" isSelected={selectedElevation === 'top'} onClick={() => setSelectedElevation('top')} />
                        </div>
                    </div>
                    <div className="settings-subsection">
                        <span className="settings-subsection-label">Sort by</span>
                        <div className="settings-options-row">
                            <OptionButton label="Temperature" isSelected={selectedSort === 'temperature'} onClick={() => setSelectedSort('temperature')} />
                            <OptionButton label="Snowfall" isSelected={selectedSort === 'snowfall'} onClick={() => setSelectedSort('snowfall')} />
                            <OptionButton label="Wind" isSelected={selectedSort === 'wind'} onClick={() => setSelectedSort('wind')} />
                        </div>
                    </div>
                    <div className="settings-subsection">
                        <span className="settings-subsection-label">View mode</span>
                        <div className="settings-options-row">
                            <OptionButton label="Default" isSelected={viewMode === 'default'} onClick={() => setViewMode('default')} />
                            <OptionButton label="Full" isSelected={viewMode === 'full'} onClick={() => setViewMode('full')} />
                            <OptionButton label="Compact" isSelected={viewMode === 'compact'} onClick={() => setViewMode('compact')} />
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
                            <OptionButton label="Total precip" isSelected={snowfallEstimateMode === 'totalPrecip'} onClick={() => setSnowfallEstimateMode('totalPrecip')} />
                        </div>
                    </div>
                </SettingSection>

                {/* Utility Bar */}
                <SettingSection title="Utility Bar" icon={icons.controls}>
                    <div className="settings-toggles">
                        <Toggle
                            label="Show utility bar"
                            isEnabled={showUtilityBar}
                            onToggle={setShowUtilityBar}
                        />
                    </div>
                    <div className="settings-subsection">
                        <span className="settings-subsection-label">Style</span>
                        <div className="settings-options-row">
                            <OptionButton label="Compact" isSelected={utilityBarStyle === 'compact'} onClick={() => setUtilityBarStyle('compact')} />
                            <OptionButton label="Large" isSelected={utilityBarStyle === 'large'} onClick={() => setUtilityBarStyle('large')} />
                        </div>
                    </div>
                </SettingSection>

                {/* Advanced */}
                <SettingSection title="Advanced" icon={icons.fps}>
                    <div className="settings-toggles">
                        <Toggle
                            label="FPS counter"
                            isEnabled={isFPSEnabled}
                            onToggle={setFPSEnabled}
                            icon={icons.fps}
                        />
                        <Toggle
                            label="Sync chart zoom"
                            isEnabled={chartZoomSyncEnabled}
                            onToggle={setChartZoomSyncEnabled}
                            icon={icons.link}
                        />
                    </div>
                </SettingSection>

                {/* Actions */}
                <SettingSection title="Resorts" icon={icons.resort}>
                    <button
                        onClick={openResortSelector}
                        className="settings-action-btn"
                    >
                        <Icon icon={icons.resort} />
                        <span>Select resorts</span>
                    </button>
                </SettingSection>
            </div>
        </div>
    );
}

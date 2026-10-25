/**
 * Chart Settings Modal
 *
 * Command-palette-style modal behind each chart's gear, with two tabs: this chart's own
 * settings (chart type and variable-specific options), and the Model styles tab, which
 * applies to every chart and widens the modal a little on desktop. Mounted only while
 * open; closing it, however it's closed, saves both tabs.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '../../hooks/useOverlay';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useLanguage } from '../../hooks/useLanguage';
import type { TranslationKey } from '../../types/i18n';
import type { AggregationType, WeatherModel, WeatherVariable } from '../../types/openMeteo';
import type { ChartDisplayType, ChartSettingsTab } from '../../types/chartSettings';
import type { ModelAvailabilityContext } from '../../types/detailView';
import { supportsAccumulation } from '../../types/chartSettings';
import { getVariableConfig, hasOverlays, getOverlayConfig } from '../../utils/chartConfigurations';
import { getModelStyles, setModelStyles } from '../../utils/modelStyles';
import { ModelStylesTab, ResetModelStyles } from './ModelStylesTab';
import { Icon } from '../Icon';
import { icons } from '../../constants/icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface ChartSettingsModalProps {
    onClose: () => void;
    variable: WeatherVariable;
    /** The tab to open on; left out, the one last used */
    initialTab?: ChartSettingsTab;
    // Model styles tab
    selectedModels: WeatherModel[];
    selectedAggregations: AggregationType[];
    modelAvailability: ModelAvailabilityContext;
    // Chart type
    chartType: ChartDisplayType;
    onChartTypeChange: (type: ChartDisplayType) => void;
    // Accumulation (for precip variables)
    showAccumulation: boolean;
    onAccumulationChange: (show: boolean) => void;
    // Multi-level overlays (for wind/soil variables)
    showOverlays: boolean;
    onOverlaysChange: (show: boolean) => void;
    // Zoom sync exclusion
    zoomSyncExcluded: boolean;
    onZoomSyncExcludedChange: (excluded: boolean) => void;
    // Chart dimensions
    chartHeight: number;
    onChartHeightChange: (height: number) => void;
    chartWidth: number;
    onChartWidthChange: (width: number) => void;
}

const CHART_TYPES: { type: ChartDisplayType; label: TranslationKey; icon: IconDefinition; requiresMultipleModels?: boolean }[] = [
    { type: 'line', label: 'detail.chartSettings.line', icon: icons.lineChart },
    { type: 'bar', label: 'detail.chartSettings.bar', icon: icons.barChart },
    { type: 'area', label: 'detail.chartSettings.area', icon: icons.areaChart },
    { type: 'boxwhisker', label: 'detail.chartSettings.boxWhisker', icon: icons.boxChart, requiresMultipleModels: true },
    { type: 'heatmap', label: 'detail.chartSettings.heatmap', icon: icons.heatmap, requiresMultipleModels: true },
];

// Dimension constraints
const HEIGHT_MIN = 200;
const HEIGHT_MAX = 800;
const WIDTH_MIN = 20;
const WIDTH_MAX = 100;

export function ChartSettingsModal({
    onClose,
    variable,
    initialTab,
    selectedModels,
    selectedAggregations,
    modelAvailability,
    chartType,
    onChartTypeChange,
    showAccumulation,
    onAccumulationChange,
    showOverlays,
    onOverlaysChange,
    zoomSyncExcluded,
    onZoomSyncExcludedChange,
    chartHeight,
    onChartHeightChange,
    chartWidth,
    onChartWidthChange,
}: ChartSettingsModalProps): JSX.Element {
    const { t } = useLanguage();
    // The tab last chosen, on every chart's gear
    const [lastTab, setLastTab] = useLocalStorage<ChartSettingsTab>('chartSettingsTab', 'chart');
    const [tab, setTab] = useState<ChartSettingsTab>(initialTab ?? lastTab);
    const selectTab = (next: ChartSettingsTab) => {
        setTab(next);
        setLastTab(next);
    };

    // Local state for changes, saved on close
    const [localChartType, setLocalChartType] = useState(chartType);
    const [localShowAccumulation, setLocalShowAccumulation] = useState(showAccumulation);
    const [localShowOverlays, setLocalShowOverlays] = useState(showOverlays);
    const [localZoomSyncExcluded, setLocalZoomSyncExcluded] = useState(zoomSyncExcluded);
    const [localChartHeight, setLocalChartHeight] = useState(chartHeight);
    const [localChartWidth, setLocalChartWidth] = useState(chartWidth);
    const [localModelStyles, setLocalModelStyles] = useState(getModelStyles);

    const saveAndClose = () => {
        onChartTypeChange(localChartType);
        onAccumulationChange(localShowAccumulation);
        onOverlaysChange(localShowOverlays);
        onZoomSyncExcludedChange(localZoomSyncExcluded);
        onChartHeightChange(localChartHeight);
        onChartWidthChange(localChartWidth);
        // Every chart redraws when Model styles change, so only when they did
        if (localModelStyles !== getModelStyles()) {
            setModelStyles(localModelStyles);
        }
        onClose();
    };

    // Lock page scroll while open; Esc closes, and saves, like every other way out
    useOverlay(true, saveAndClose);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            saveAndClose();
        }
    };

    const variableConfig = getVariableConfig(variable);
    const hasAccumulation = supportsAccumulation(variable);
    const hasOverlayLevels = hasOverlays(variable);
    const overlayConfig = hasOverlayLevels ? getOverlayConfig(variable) : null;

    return createPortal(
        <div className="command-palette-backdrop" onClick={handleBackdropClick}>
            <div className={`command-palette chart-settings-modal${tab === 'models' ? ' model-styles-wide' : ''}`}>
                {/* Header */}
                <div className="chart-settings-header">
                    <div className="chart-settings-tabs" role="tablist">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'chart'}
                            className={`chart-settings-tab ${tab === 'chart' ? 'selected' : ''}`}
                            onClick={() => selectTab('chart')}
                        >
                            <span
                                className="w-3 h-3 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: variableConfig.color }}
                            />
                            <span className="chart-settings-tab-label">{variableConfig.label}</span>
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'models'}
                            className={`chart-settings-tab ${tab === 'models' ? 'selected' : ''}`}
                            onClick={() => selectTab('models')}
                        >
                            <span className="chart-settings-tab-label">{t('detail.modelStyles.title')}</span>
                            <span className="chart-settings-tab-hint">{t('detail.chartSettings.modelStylesHint')}</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="chart-settings-content" role="tabpanel">
                    {tab === 'models' ? (
                        <ModelStylesTab
                            styles={localModelStyles}
                            onChange={setLocalModelStyles}
                            selectedModels={selectedModels}
                            selectedAggregations={selectedAggregations}
                            modelAvailability={modelAvailability}
                        />
                    ) : (
                        <>
                            {/* Chart Type Section */}
                            <div className="chart-settings-section">
                                <h3 className="chart-settings-section-title">{t('detail.chartSettings.chartType')}</h3>
                                <div className="chart-type-options">
                                    {CHART_TYPES.map(({ type, label, icon }) => (
                                        <button
                                            key={type}
                                            type="button"
                                            className={`chart-type-option ${localChartType === type ? 'selected' : ''}`}
                                            onClick={() => setLocalChartType(type)}
                                        >
                                            <span className="chart-type-icon"><Icon icon={icon} /></span>
                                            <span className="chart-type-label">{t(label)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Accumulation Option (for precip variables) */}
                            {hasAccumulation && (
                                <div className="chart-settings-section">
                                    <h3 className="chart-settings-section-title">{t('detail.chartSettings.accumulation')}</h3>
                                    <label className="chart-settings-toggle">
                                        <input
                                            type="checkbox"
                                            checked={localShowAccumulation}
                                            onChange={(e) => setLocalShowAccumulation(e.target.checked)}
                                        />
                                        <span className="chart-settings-toggle-label">
                                            {t('detail.chartSettings.showAccumulation')}
                                        </span>
                                        <span className="chart-settings-toggle-desc">
                                            {t('detail.chartSettings.accumulationDescription')}
                                        </span>
                                    </label>
                                </div>
                            )}

                            {/* Multi-Level Overlay Option (for wind/soil variables) */}
                            {hasOverlayLevels && overlayConfig && (
                                <div className="chart-settings-section">
                                    <h3 className="chart-settings-section-title">{t('detail.chartSettings.overlays')}</h3>
                                    <label className="chart-settings-toggle">
                                        <input
                                            type="checkbox"
                                            checked={localShowOverlays}
                                            onChange={(e) => setLocalShowOverlays(e.target.checked)}
                                        />
                                        <span className="chart-settings-toggle-label">
                                            {t('detail.chartSettings.showOverlays', { levels: overlayConfig.description })}
                                        </span>
                                        <span className="chart-settings-toggle-desc">
                                            {t('detail.chartSettings.overlaysDescription', {
                                                count: overlayConfig.overlays.length,
                                                levels: overlayConfig.description,
                                            })}
                                        </span>
                                    </label>
                                    {localShowOverlays && (
                                        <div className="chart-settings-overlay-levels">
                                            {overlayConfig.overlays.map((overlay) => (
                                                <span
                                                    key={overlay.variable}
                                                    className="chart-settings-overlay-badge"
                                                    style={{ backgroundColor: overlay.color, opacity: overlay.opacity ?? 0.7 }}
                                                >
                                                    {overlay.label}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Sync Option */}
                            <div className="chart-settings-section">
                                <h3 className="chart-settings-section-title">{t('detail.chartSettings.sync')}</h3>
                                <label className="chart-settings-toggle">
                                    <input
                                        type="checkbox"
                                        checked={!localZoomSyncExcluded}
                                        onChange={(e) => setLocalZoomSyncExcluded(!e.target.checked)}
                                    />
                                    <span className="chart-settings-toggle-label">
                                        {t('detail.chartSettings.syncZoom')}
                                    </span>
                                    <span className="chart-settings-toggle-desc">
                                        {t('detail.chartSettings.syncDescription')}
                                    </span>
                                </label>
                            </div>

                            {/* Dimensions Section */}
                            <div className="chart-settings-section">
                                <h3 className="chart-settings-section-title">{t('detail.chartSettings.dimensions')}</h3>

                                {/* Height Slider */}
                                <div className="chart-settings-slider">
                                    <label className="chart-settings-slider-label">
                                        <span>{t('detail.chartSettings.height')}</span>
                                        <span className="chart-settings-slider-value">
                                            {t('detail.chartSettings.pixels', { value: localChartHeight })}
                                        </span>
                                    </label>
                                    <input
                                        type="range"
                                        min={HEIGHT_MIN}
                                        max={HEIGHT_MAX}
                                        step={20}
                                        value={localChartHeight}
                                        onChange={(e) => setLocalChartHeight(Number(e.target.value))}
                                        className="chart-settings-range"
                                    />
                                </div>

                                {/* Width Slider */}
                                <div className="chart-settings-slider">
                                    <label className="chart-settings-slider-label">
                                        <span>{t('detail.chartSettings.width')}</span>
                                        <span className="chart-settings-slider-value">{t('detail.percent', { value: localChartWidth })}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={WIDTH_MIN}
                                        max={WIDTH_MAX}
                                        step={5}
                                        value={localChartWidth}
                                        onChange={(e) => setLocalChartWidth(Number(e.target.value))}
                                        className="chart-settings-range"
                                    />
                                    <span className="chart-settings-slider-desc">
                                        {t('detail.chartSettings.widthDescription')}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="chart-settings-footer">
                    {tab === 'models' && <ResetModelStyles onChange={setLocalModelStyles} />}
                    <button
                        type="button"
                        className="chart-settings-btn apply"
                        onClick={saveAndClose}
                    >
                        {t('detail.done')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );

}

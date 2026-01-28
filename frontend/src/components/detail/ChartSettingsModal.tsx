/**
 * Chart Settings Modal
 *
 * Command-palette-style modal for configuring individual chart settings.
 * Allows changing chart type and variable-specific options.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { WeatherVariable } from '../../types/openMeteo';
import type { ChartDisplayType } from '../../types/chartSettings';
import { supportsAccumulation } from '../../types/chartSettings';
import { getVariableConfig, hasOverlays, getOverlayConfig } from '../../utils/chartConfigurations';
import { Icon } from '../Icon';
import { icons } from '../../constants/icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface ChartSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    variable: WeatherVariable;
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

const CHART_TYPES: { type: ChartDisplayType; label: string; icon: IconDefinition; requiresMultipleModels?: boolean }[] = [
    { type: 'line', label: 'Line', icon: icons.lineChart },
    { type: 'bar', label: 'Bar', icon: icons.barChart },
    { type: 'area', label: 'Area', icon: icons.areaChart },
    { type: 'boxwhisker', label: 'Box & Whisker', icon: icons.boxChart, requiresMultipleModels: true },
    { type: 'heatmap', label: 'Heatmap', icon: icons.heatmap, requiresMultipleModels: true },
];

// Dimension constraints
const HEIGHT_MIN = 200;
const HEIGHT_MAX = 800;
const WIDTH_MIN = 20;
const WIDTH_MAX = 100;

export function ChartSettingsModal({
    isOpen,
    onClose,
    variable,
    chartType,
    onChartTypeChange,
    showAccumulation,
    onAccumulationChange,
    zoomSyncExcluded,
    onZoomSyncExcludedChange,
    chartHeight,
    onChartHeightChange,
    chartWidth,
    onChartWidthChange,
}: ChartSettingsModalProps): JSX.Element | null {
    // Local state for changes before applying
    const [localChartType, setLocalChartType] = useState(chartType);
    const [localShowAccumulation, setLocalShowAccumulation] = useState(showAccumulation);
    const [localZoomSyncExcluded, setLocalZoomSyncExcluded] = useState(zoomSyncExcluded);
    const [localChartHeight, setLocalChartHeight] = useState(chartHeight);
    const [localChartWidth, setLocalChartWidth] = useState(chartWidth);

    // Sync local state when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalChartType(chartType);
            setLocalShowAccumulation(showAccumulation);
            setLocalZoomSyncExcluded(zoomSyncExcluded);
            setLocalChartHeight(chartHeight);
            setLocalChartWidth(chartWidth);
        }
    }, [isOpen, chartType, showAccumulation, zoomSyncExcluded, chartHeight, chartWidth]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Handle keyboard events
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleApply = () => {
        onChartTypeChange(localChartType);
        onAccumulationChange(localShowAccumulation);
        onZoomSyncExcludedChange(localZoomSyncExcluded);
        onChartHeightChange(localChartHeight);
        onChartWidthChange(localChartWidth);
        onClose();
    };

    const variableConfig = getVariableConfig(variable);
    const hasAccumulation = supportsAccumulation(variable);

    return createPortal(
        <div className="command-palette-backdrop" onClick={handleBackdropClick}>
            <div className="command-palette chart-settings-modal">
                {/* Header */}
                <div className="chart-settings-header">
                    <div className="chart-settings-title-row">
                        <span
                            className="w-3 h-3 rounded-full inline-block"
                            style={{ backgroundColor: variableConfig.color }}
                        />
                        <h2 className="chart-settings-title">{variableConfig.label} Settings</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="chart-settings-content">
                    {/* Chart Type Section */}
                    <div className="chart-settings-section">
                        <h3 className="chart-settings-section-title">Chart Type</h3>
                        <div className="chart-type-options">
                            {CHART_TYPES.map(({ type, label, icon }) => (
                                <button
                                    key={type}
                                    type="button"
                                    className={`chart-type-option ${localChartType === type ? 'selected' : ''}`}
                                    onClick={() => setLocalChartType(type)}
                                >
                                    <span className="chart-type-icon"><Icon icon={icon} /></span>
                                    <span className="chart-type-label">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Accumulation Option (for precip variables) */}
                    {hasAccumulation && (
                        <div className="chart-settings-section">
                            <h3 className="chart-settings-section-title">Overlay</h3>
                            <label className="chart-settings-toggle">
                                <input
                                    type="checkbox"
                                    checked={localShowAccumulation}
                                    onChange={(e) => setLocalShowAccumulation(e.target.checked)}
                                />
                                <span className="chart-settings-toggle-label">
                                    Show accumulation graph overlay
                                </span>
                                <span className="chart-settings-toggle-desc">
                                    Displays cumulative total as a line graph
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Zoom Sync Option */}
                    <div className="chart-settings-section">
                        <h3 className="chart-settings-section-title">Zoom Sync</h3>
                        <label className="chart-settings-toggle">
                            <input
                                type="checkbox"
                                checked={!localZoomSyncExcluded}
                                onChange={(e) => setLocalZoomSyncExcluded(!e.target.checked)}
                            />
                            <span className="chart-settings-toggle-label">
                                Sync zoom with other charts
                            </span>
                            <span className="chart-settings-toggle-desc">
                                When enabled, zooming this chart also zooms other charts
                            </span>
                        </label>
                    </div>

                    {/* Dimensions Section */}
                    <div className="chart-settings-section">
                        <h3 className="chart-settings-section-title">Dimensions</h3>

                        {/* Height Slider */}
                        <div className="chart-settings-slider">
                            <label className="chart-settings-slider-label">
                                <span>Height</span>
                                <span className="chart-settings-slider-value">{localChartHeight}px</span>
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
                                <span>Width (fullscreen)</span>
                                <span className="chart-settings-slider-value">{localChartWidth}%</span>
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
                                Width only applies when chart is in fullscreen mode
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="chart-settings-footer">
                    <button
                        type="button"
                        className="chart-settings-btn cancel"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="chart-settings-btn apply"
                        onClick={handleApply}
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );

}

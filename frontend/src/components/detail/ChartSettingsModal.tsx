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
import { getVariableConfig } from '../../utils/chartConfigurations';

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
    // Zoom sync exclusion
    zoomSyncExcluded: boolean;
    onZoomSyncExcludedChange: (excluded: boolean) => void;
}

const CHART_TYPES: { type: ChartDisplayType; label: string; icon: string }[] = [
    { type: 'line', label: 'Line', icon: '📈' },
    { type: 'bar', label: 'Bar', icon: '📊' },
    { type: 'area', label: 'Area', icon: '📉' },
];

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
}: ChartSettingsModalProps): JSX.Element | null {
    // Local state for changes before applying
    const [localChartType, setLocalChartType] = useState(chartType);
    const [localShowAccumulation, setLocalShowAccumulation] = useState(showAccumulation);
    const [localZoomSyncExcluded, setLocalZoomSyncExcluded] = useState(zoomSyncExcluded);

    // Sync local state when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalChartType(chartType);
            setLocalShowAccumulation(showAccumulation);
            setLocalZoomSyncExcluded(zoomSyncExcluded);
        }
    }, [isOpen, chartType, showAccumulation, zoomSyncExcluded]);

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
                                    <span className="chart-type-icon">{icon}</span>
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

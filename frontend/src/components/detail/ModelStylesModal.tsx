/**
 * The Models tab on its own, for where there is no chart to open a gear modal on:
 * the Settings page, and the command palette away from the detail view.
 * Mounted only while open.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '../../hooks/useOverlay';
import { usePreferredModels, useSelectedAggregations } from '../../hooks/usePreferredModels';
import { getModelStyles, setModelStyles } from '../../utils/modelStyles';
import { ModelStylesTab } from './ModelStylesTab';

export function ModelStylesModal({ onClose }: { onClose: () => void }): JSX.Element {
    const [preferredModels] = usePreferredModels();
    const [selectedAggregations] = useSelectedAggregations();
    const [localModelStyles, setLocalModelStyles] = useState(getModelStyles);

    // Lock page scroll while open, and close on Esc
    useOverlay(true, onClose);

    const handleApply = () => {
        if (localModelStyles !== getModelStyles()) {
            setModelStyles(localModelStyles);
        }
        onClose();
    };

    return createPortal(
        <div
            className="command-palette-backdrop"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="command-palette chart-settings-modal">
                <div className="chart-settings-header">
                    <h2 className="chart-settings-title">Model styles</h2>
                </div>

                <div className="chart-settings-content">
                    <ModelStylesTab
                        styles={localModelStyles}
                        onChange={setLocalModelStyles}
                        preferredModels={preferredModels}
                        selectedAggregations={selectedAggregations}
                    />
                </div>

                <div className="chart-settings-footer">
                    <button type="button" className="chart-settings-btn cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className="chart-settings-btn apply" onClick={handleApply}>
                        Apply
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

/**
 * The Model styles tab on its own, at that tab's size, for where there is no chart to open
 * a gear modal on: the Settings page, and the command palette away from the detail view.
 * Mounted only while open.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '../../hooks/useOverlay';
import { useLanguage } from '../../hooks/useLanguage';
import { useSelectedModels, useSelectedAggregations } from '../../hooks/useSelectedModels';
import { getModelStyles, setModelStyles } from '../../utils/modelStyles';
import { ModelStylesTab, ResetModelStyles } from './ModelStylesTab';

export function ModelStylesModal({ onClose }: { onClose: () => void }): JSX.Element {
    const { t } = useLanguage();
    const [selectedModels] = useSelectedModels();
    const [selectedAggregations] = useSelectedAggregations();
    const [localModelStyles, setLocalModelStyles] = useState(getModelStyles);

    const saveAndClose = () => {
        if (localModelStyles !== getModelStyles()) {
            setModelStyles(localModelStyles);
        }
        onClose();
    };

    // Lock page scroll while open; Esc closes, and saves, like every other way out
    useOverlay(true, saveAndClose);

    return createPortal(
        <div
            className="command-palette-backdrop"
            onClick={(e) => {
                if (e.target === e.currentTarget) saveAndClose();
            }}
        >
            <div className="command-palette chart-settings-modal model-styles-wide">
                <div className="chart-settings-header">
                    <h2 className="chart-settings-title">{t('detail.modelStyles.title')}</h2>
                </div>

                <div className="chart-settings-content">
                    <ModelStylesTab
                        styles={localModelStyles}
                        onChange={setLocalModelStyles}
                        selectedModels={selectedModels}
                        selectedAggregations={selectedAggregations}
                    />
                </div>

                <div className="chart-settings-footer">
                    <ResetModelStyles onChange={setLocalModelStyles} />
                    <button type="button" className="chart-settings-btn apply" onClick={saveAndClose}>
                        {t('detail.done')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

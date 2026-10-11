/**
 * The Slope bands editor on its own, for the Settings page and the command palette; the map's
 * layers panel shows the same editor. Changes are saved as they are made, so closing just closes.
 * Mounted only while open.
 */

import { createPortal } from 'react-dom';
import { useOverlay } from '../../hooks/useOverlay';
import { SlopeBandsEditor } from './SlopeBandsEditor';

export function SlopeBandsModal({ onClose }: { onClose: () => void }): JSX.Element {
    // Lock page scroll while open; Esc closes
    useOverlay(true, onClose);

    return createPortal(
        <div
            className="command-palette-backdrop"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="command-palette chart-settings-modal">
                <div className="chart-settings-header">
                    <h2 className="chart-settings-title">Slope bands</h2>
                </div>

                <div className="chart-settings-content">
                    <p className="slope-bands-intro">The ranges of steepness the Slope angle map colouring paints, and their colours, on both maps.</p>
                    <SlopeBandsEditor />
                </div>

                <div className="chart-settings-footer">
                    <button type="button" className="chart-settings-btn apply" onClick={onClose}>
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

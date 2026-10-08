import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '../../hooks/useOverlay';
import {
    MAX_SAVED_ELEVATION,
    MAX_SAVED_NAME_LENGTH,
    MIN_SAVED_ELEVATION,
} from '../../utils/savedLocations';
import type { UnitSystem } from '../../types';

const M_TO_FT = 3.28084;

interface SavedLocationDialogProps {
    title: string;
    submitLabel: string;
    initialName: string;
    /** Metres; null leaves the field empty for the visitor to fill, e.g. when no forecast reported it */
    initialElevation: number | null;
    /** True while the forecast that reports the ground elevation is still loading */
    isLoadingElevation?: boolean;
    unitSystem: UnitSystem;
    onSubmit: (values: { name: string; elevation: number }) => void;
    onCancel: () => void;
}

/**
 * Names a Saved location and sets its one elevation, for both Save and Edit.
 * Submitting needs a name and a real elevation, never a fallback.
 */
export function SavedLocationDialog({
    title,
    submitLabel,
    initialName,
    initialElevation,
    isLoadingElevation = false,
    unitSystem,
    onSubmit,
    onCancel,
}: SavedLocationDialogProps): JSX.Element {
    const isImperial = unitSystem === 'imperial';
    const toDisplay = (metres: number) => String(isImperial ? Math.round(metres * M_TO_FT) : metres);

    const [name, setName] = useState(initialName);
    const [elevationText, setElevationText] = useState(initialElevation === null ? '' : toDisplay(initialElevation));

    // Fill in the ground elevation once the forecast reports it, unless the visitor typed one already
    useEffect(() => {
        if (initialElevation !== null) {
            setElevationText((current) => current || toDisplay(initialElevation));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialElevation]);

    // Esc cancels, the page behind can't scroll, and Tab moves between the fields
    useOverlay(true, onCancel);

    const trimmedName = name.trim();
    const typed = Number(elevationText);
    const elevationMetres = elevationText.trim() !== '' && Number.isFinite(typed)
        ? Math.round(isImperial ? typed / M_TO_FT : typed)
        : null;
    const elevationValid = elevationMetres !== null
        && elevationMetres >= MIN_SAVED_ELEVATION
        && elevationMetres <= MAX_SAVED_ELEVATION;
    const canSubmit = trimmedName.length > 0 && elevationValid;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (canSubmit) onSubmit({ name: trimmedName, elevation: elevationMetres! });
    };

    const unit = isImperial ? 'ft' : 'm';
    const inputClass = 'w-full px-2 py-1.5 text-sm rounded border border-theme-border bg-theme-cardBg text-theme-textPrimary placeholder-theme-textSecondary focus:outline-none focus:border-theme-accent';

    return createPortal(
        <div className="command-palette-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <form className="command-palette chart-settings-modal" onSubmit={handleSubmit}>
                <div className="chart-settings-header">
                    <h2 className="chart-settings-title">{title}</h2>
                </div>

                <div className="chart-settings-content space-y-3">
                    <label className="block">
                        <span className="block mb-1 text-xs text-theme-textSecondary">Name</span>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={MAX_SAVED_NAME_LENGTH}
                            autoFocus
                            className={inputClass}
                        />
                    </label>
                    <label className="block">
                        <span className="block mb-1 text-xs text-theme-textSecondary">Elevation</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={elevationText}
                                onChange={(e) => setElevationText(e.target.value)}
                                placeholder={isLoadingElevation ? 'Looking up...' : 'Elevation'}
                                min={isImperial ? Math.ceil(MIN_SAVED_ELEVATION * M_TO_FT) : MIN_SAVED_ELEVATION}
                                max={isImperial ? Math.floor(MAX_SAVED_ELEVATION * M_TO_FT) : MAX_SAVED_ELEVATION}
                                className={inputClass}
                            />
                            <span className="text-sm text-theme-textSecondary">{unit}</span>
                        </div>
                        {elevationText.trim() !== '' && !elevationValid && (
                            <span className="block mt-1 text-xs text-red-500">
                                Between {toDisplay(MIN_SAVED_ELEVATION)} and {toDisplay(MAX_SAVED_ELEVATION)} {unit}
                            </span>
                        )}
                    </label>
                </div>

                <div className="chart-settings-footer">
                    <button type="button" className="chart-settings-btn cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="submit" className="chart-settings-btn apply disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canSubmit}>
                        {submitLabel}
                    </button>
                </div>
            </form>
        </div>,
        document.body
    );
}

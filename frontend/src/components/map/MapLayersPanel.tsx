import { forwardRef, useState } from 'react';
import {
    BASE_MAPS,
    OVERLAYS,
    TERRAIN_COLOURINGS,
    terrainColouring,
    withOverlay,
    withTerrainColouring,
    type MapLayers,
    type OverlayId,
    type TerrainColouringId,
} from '../../utils/mapLayers';
import { useLanguage } from '../../hooks/useLanguage';
import { SlopeBandsEditor } from './SlopeBandsEditor';

interface MapLayersPanelProps {
    layers: MapLayers;
    onChange: (layers: MapLayers) => void;
    /** A short note beside an Overlay that is on but can't show right now, e.g. "Zoom in to see runs" */
    hints: Partial<Record<OverlayId, string>>;
    /** The 3D map always shades its terrain, so Hillshade can't be turned off there */
    is3D: boolean;
    /** Whether the Cursor readout shows; left out where there is no mouse, which it needs */
    cursorReadout?: boolean;
    onCursorReadoutChange: (shown: boolean) => void;
}

/**
 * Picks the Base map, turns Overlays on and off, picks the Terrain colouring and edits Slope angle's
 * bands, and turns the Cursor readout on and off; opened by the layers button on either map.
 */
export const MapLayersPanel = forwardRef<HTMLDivElement, MapLayersPanelProps>(function MapLayersPanel(
    { layers, onChange, hints, is3D, cursorReadout, onCursorReadoutChange },
    ref,
) {
    const { t } = useLanguage();
    const [isEditingBands, setIsEditingBands] = useState(false);
    const toggle = (id: OverlayId) => onChange(withOverlay(layers, id, !layers.overlays.includes(id)));
    const colouring = terrainColouring(layers);
    const colourings: { id: TerrainColouringId | null; label: string }[] = [{ id: null, label: t('map.layers.none') }, ...TERRAIN_COLOURINGS];

    return (
        <div ref={ref} className="resort-map-layers" role="group" aria-label={t('map.layers')}>
            <div className="resort-map-layers-bases" role="radiogroup" aria-label={t('map.layers.baseMap')}>
                {BASE_MAPS.map(base => (
                    <button
                        key={base.id}
                        type="button"
                        role="radio"
                        aria-checked={layers.baseMap === base.id}
                        className={`resort-map-layers-base ${layers.baseMap === base.id ? 'active' : ''}`}
                        onClick={() => onChange({ ...layers, baseMap: base.id })}
                    >
                        {base.label}
                    </button>
                ))}
            </div>
            {OVERLAYS.map(overlay => {
                const alwaysOn = is3D && overlay.id === 'hillshade';
                const on = alwaysOn || layers.overlays.includes(overlay.id);
                const hint = alwaysOn ? t('map.layers.alwaysOn3d') : on ? hints[overlay.id] : undefined;
                return (
                    <label key={overlay.id} className={`resort-map-layers-overlay ${alwaysOn ? 'disabled' : ''}`}>
                        <input type="checkbox" checked={on} disabled={alwaysOn} onChange={() => toggle(overlay.id)} />
                        <span>{overlay.label}</span>
                        {hint && <span className="resort-map-layers-hint">{hint}</span>}
                    </label>
                );
            })}
            <div className="resort-map-layers-heading" id="resort-map-colour-terrain">{t('map.layers.colourTerrainBy')}</div>
            <div role="radiogroup" aria-labelledby="resort-map-colour-terrain">
                {colourings.map(option => {
                    const on = colouring === option.id;
                    const hint = on && option.id ? hints[option.id] : undefined;
                    return (
                        <div key={option.id ?? 'none'}>
                            <label className="resort-map-layers-overlay">
                                <input
                                    type="radio"
                                    name="resort-map-terrain-colouring"
                                    checked={on}
                                    onChange={() => onChange(withTerrainColouring(layers, option.id))}
                                />
                                <span>{option.label}</span>
                                {hint && <span className="resort-map-layers-hint">{hint}</span>}
                            </label>
                            {on && option.id === 'slopeAngle' && (
                                <>
                                    <button
                                        type="button"
                                        className="resort-map-layers-edit"
                                        aria-expanded={isEditingBands}
                                        onClick={() => setIsEditingBands(editing => !editing)}
                                    >
                                        <svg className={`w-3 h-3 ${isEditingBands ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                        {t('map.layers.editBands')}
                                    </button>
                                    {isEditingBands && <SlopeBandsEditor />}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
            {cursorReadout !== undefined && (
                <>
                    <div className="resort-map-layers-heading">{t('map.layers.underMouse')}</div>
                    <label className="resort-map-layers-overlay">
                        <input type="checkbox" checked={cursorReadout} onChange={() => onCursorReadoutChange(!cursorReadout)} />
                        <span>{t('map.layers.cursorReadout')}</span>
                    </label>
                </>
            )}
        </div>
    );
});

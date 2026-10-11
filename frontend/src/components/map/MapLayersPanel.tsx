import { forwardRef } from 'react';
import {
    BASE_MAPS,
    OVERLAYS,
    TERRAIN_COLOURINGS,
    terrainColouring,
    withTerrainColouring,
    type MapLayers,
    type OverlayId,
    type TerrainColouringId,
} from '../../utils/mapLayers';

interface MapLayersPanelProps {
    layers: MapLayers;
    onChange: (layers: MapLayers) => void;
    /** A short note beside an Overlay that is on but can't show right now, e.g. "Zoom in to see runs" */
    hints: Partial<Record<OverlayId, string>>;
    /** The 3D map always shades its terrain, so Hillshade can't be turned off there */
    is3D: boolean;
}

/** Picks the Base map, turns Overlays on and off, and picks the Terrain colouring; opened by the layers button on either map. */
export const MapLayersPanel = forwardRef<HTMLDivElement, MapLayersPanelProps>(function MapLayersPanel({ layers, onChange, hints, is3D }, ref) {
    const toggle = (id: OverlayId) => onChange({
        ...layers,
        overlays: layers.overlays.includes(id) ? layers.overlays.filter(o => o !== id) : [...layers.overlays, id],
    });
    const colouring = terrainColouring(layers);
    const colourings: { id: TerrainColouringId | null; label: string }[] = [{ id: null, label: 'None' }, ...TERRAIN_COLOURINGS];

    return (
        <div ref={ref} className="resort-map-layers" role="group" aria-label="Map layers">
            <div className="resort-map-layers-bases" role="radiogroup" aria-label="Base map">
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
                const hint = alwaysOn ? 'Always on in 3D' : on ? hints[overlay.id] : undefined;
                return (
                    <label key={overlay.id} className={`resort-map-layers-overlay ${alwaysOn ? 'disabled' : ''}`}>
                        <input type="checkbox" checked={on} disabled={alwaysOn} onChange={() => toggle(overlay.id)} />
                        <span>{overlay.label}</span>
                        {hint && <span className="resort-map-layers-hint">{hint}</span>}
                    </label>
                );
            })}
            <div className="resort-map-layers-heading" id="resort-map-colour-terrain">Colour terrain by</div>
            <div role="radiogroup" aria-labelledby="resort-map-colour-terrain">
                {colourings.map(option => {
                    const on = colouring === option.id;
                    const hint = on && option.id ? hints[option.id] : undefined;
                    return (
                        <label key={option.id ?? 'none'} className="resort-map-layers-overlay">
                            <input
                                type="radio"
                                name="resort-map-terrain-colouring"
                                checked={on}
                                onChange={() => onChange(withTerrainColouring(layers, option.id))}
                            />
                            <span>{option.label}</span>
                            {hint && <span className="resort-map-layers-hint">{hint}</span>}
                        </label>
                    );
                })}
            </div>
        </div>
    );
});

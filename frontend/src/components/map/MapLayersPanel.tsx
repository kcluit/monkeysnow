import { forwardRef, useEffect, useRef } from 'react';
import { BASE_MAPS, OVERLAYS, type MapLayers, type OverlayId } from '../../utils/mapLayers';
import { SLOPE_ANGLE_BANDS } from '../../utils/terrainRendering';

/** The slope angle bands and their warning, scrolled into view when they appear, since the small map's panel scrolls. */
function SlopeAngleLegend(): JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        ref.current?.scrollIntoView({ block: 'nearest' });
    }, []);
    return (
        <div ref={ref} className="resort-map-layers-legend">
            <div className="resort-map-layers-bands">
                {[...SLOPE_ANGLE_BANDS].reverse().map(band => (
                    <span key={band.from}>
                        <i style={{ background: `rgb(${band.colour.join(', ')})` }} />
                        {band.from}°{band === SLOPE_ANGLE_BANDS[0] ? '+' : ''}
                    </span>
                ))}
            </div>
            Approximate, not for avalanche decisions
        </div>
    );
}

interface MapLayersPanelProps {
    layers: MapLayers;
    onChange: (layers: MapLayers) => void;
    /** A short note beside an Overlay that is on but can't show right now, e.g. "Zoom in to see runs" */
    hints: Partial<Record<OverlayId, string>>;
}

/** Picks the Base map and turns Overlays on and off; opened by the layers button on the map. */
export const MapLayersPanel = forwardRef<HTMLDivElement, MapLayersPanelProps>(function MapLayersPanel({ layers, onChange, hints }, ref) {
    const toggle = (id: OverlayId) => onChange({
        ...layers,
        overlays: layers.overlays.includes(id) ? layers.overlays.filter(o => o !== id) : [...layers.overlays, id],
    });

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
                const on = layers.overlays.includes(overlay.id);
                const hint = on ? hints[overlay.id] : undefined;
                return (
                    <label key={overlay.id} className="resort-map-layers-overlay">
                        <input type="checkbox" checked={on} onChange={() => toggle(overlay.id)} />
                        <span>{overlay.label}</span>
                        {hint && <span className="resort-map-layers-hint">{hint}</span>}
                    </label>
                );
            })}
            {layers.overlays.includes('slopeAngle') && <SlopeAngleLegend />}
        </div>
    );
});

import { useState } from 'react';
import { TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
    EOX_ATTRIBUTION,
    EOX_MAX_NATIVE_ZOOM,
    EOX_URL,
    NATIONAL_MIN_ZOOM,
    NATIONAL_SOURCES,
} from '../../utils/satelliteImagery';

/**
 * The Satellite Base map on the flat map: open national aerial photos where a country
 * publishes them, over EOX's Sentinel-2 mosaic everywhere else (utils/satelliteImagery.ts).
 */

const EXTENT_BOUNDS = new Map(NATIONAL_SOURCES.map(s => [s.id, s.extents.map(e => L.latLngBounds(e))]));

/** The national sources with photos in view, so the map only credits (and fetches) what it shows. */
function sourcesInView(map: L.Map): string[] {
    if (map.getZoom() < NATIONAL_MIN_ZOOM) return [];
    const view = map.getBounds();
    return NATIONAL_SOURCES
        .filter(s => EXTENT_BOUNDS.get(s.id)!.some(b => b.intersects(view)))
        .map(s => s.id);
}

export function SatelliteBaseMap(): JSX.Element {
    const map = useMapEvents({
        moveend: () => {
            const next = sourcesInView(map);
            setVisible(prev => (prev.join() === next.join() ? prev : next));
        },
    });
    const [visible, setVisible] = useState(() => sourcesInView(map));

    return (
        <>
            <TileLayer url={EOX_URL} attribution={EOX_ATTRIBUTION} maxNativeZoom={EOX_MAX_NATIVE_ZOOM} zIndex={1} />
            {NATIONAL_SOURCES.map((source, i) => visible.includes(source.id) && source.extents.map((extent, j) => (
                <TileLayer
                    key={`${source.id}-${j}`}
                    url={source.url}
                    attribution={source.attribution}
                    maxNativeZoom={source.maxNativeZoom}
                    minZoom={NATIONAL_MIN_ZOOM}
                    bounds={extent}
                    zIndex={2 + i}
                />
            )))}
        </>
    );
}

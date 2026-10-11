import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { SkiMapFeature } from '../../utils/skiMapData';
import type { DifficultyConvention } from '../../utils/difficultyColours';
import { OPENSKIDATA_ATTRIBUTION, OSM_ATTRIBUTION } from '../../utils/mapLayers';
import {
    LIFT_COLOUR,
    describeCustomLocationOn,
    featureAt,
    hoverName,
    runStyle,
    startSkiMapLoader,
    type SkiMapStatus,
} from './skiMapFeatures';

// Areas under Runs, white casings under coloured lines, then Lifts over everything; all under the markers (600).
// Only the top canvas gets the mouse, so names on hover come from invisible lines in a pane of their own.
const PANES = [
    { name: 'skiMapAreas', zIndex: 405 },
    { name: 'skiMapCasings', zIndex: 410 },
    { name: 'skiMapRuns', zIndex: 420 },
    { name: 'skiMapLifts', zIndex: 430 },
    { name: 'skiMapHover', zIndex: 440 },
] as const;

type Renderers = Record<(typeof PANES)[number]['name'], L.Canvas>;

/** The Leaflet layers that draw one Run or Lift. */
function featureLayers(feature: SkiMapFeature, convention: DifficultyConvention, renderers: Renderers): L.Path[] {
    const latlngs = feature.coords;
    if (feature.kind === 'lift') {
        return [
            L.polyline(latlngs, { renderer: renderers.skiMapLifts, color: '#ffffff', weight: 4.5, opacity: 0.8, interactive: false }),
            L.polyline(latlngs, { renderer: renderers.skiMapLifts, color: LIFT_COLOUR, weight: 2, interactive: false }),
            // Short bars across the line, like the pylons on a trail map
            L.polyline(latlngs, { renderer: renderers.skiMapLifts, color: LIFT_COLOUR, weight: 7, dashArray: '1.5 16', lineCap: 'butt', interactive: false }),
        ];
    }

    const { colour, dashArray, downhill } = runStyle(feature, convention);
    if (feature.area) {
        return [L.polygon(latlngs, {
            renderer: renderers.skiMapAreas, color: colour, weight: 1, opacity: 0.5, fillColor: colour, fillOpacity: 0.15, interactive: false,
        })];
    }
    return [
        L.polyline(latlngs, { renderer: renderers.skiMapCasings, color: '#ffffff', weight: 5, opacity: 0.6, interactive: false }),
        L.polyline(latlngs, { renderer: renderers.skiMapRuns, color: colour, weight: downhill ? 3 : 2.5, dashArray, interactive: false }),
    ];
}

/** An invisible copy of a Run or Lift, a little wider, that shows its name while the mouse is over it. */
function hoverLayer(feature: SkiMapFeature, convention: DifficultyConvention, renderers: Renderers): L.Path {
    const options: L.PolylineOptions = { renderer: renderers.skiMapHover, weight: 10, opacity: 0, fillOpacity: 0, interactive: true };
    const layer = feature.area ? L.polygon(feature.coords, options) : L.polyline(feature.coords, options);
    return layer.bindTooltip(hoverName(feature, convention), { sticky: true, direction: 'top', offset: [0, -8] });
}

interface SkiMapOverlayProps {
    /** How downhill Runs are coloured: the convention of the Resort's country */
    convention: DifficultyConvention;
    customLocation: { lat: number; lon: number } | null | undefined;
    onStatusChange: (status: SkiMapStatus) => void;
    /** What the Custom location is on, e.g. "On Peak to Creek, blue run", or null */
    onCustomLocationOnChange: (text: string | null) => void;
}

/**
 * The Ski map: every Run and Lift in view, fetched from OpenStreetMap as the map moves.
 * Names show on hover where there is a mouse; on touch screens a tap always picks a
 * Custom location, whose popup then says what it is on.
 */
export function SkiMapOverlay({ convention, customLocation, onStatusChange, onCustomLocationOnChange }: SkiMapOverlayProps): null {
    const map = useMap();
    const [features, setFeatures] = useState<ReadonlyMap<string, SkiMapFeature>>(() => new Map());

    const onStatusChangeRef = useRef(onStatusChange);
    const onCustomLocationOnChangeRef = useRef(onCustomLocationOnChange);
    useLayoutEffect(() => {
        onStatusChangeRef.current = onStatusChange;
        onCustomLocationOnChangeRef.current = onCustomLocationOnChange;
    });

    useEffect(() => {
        for (const { name, zIndex } of PANES) {
            if (!map.getPane(name)) map.createPane(name).style.zIndex = String(zIndex);
        }
        const renderers = Object.fromEntries(PANES.map(({ name }) => [name, L.canvas({ pane: name, tolerance: 4 })])) as Renderers;
        const group = L.layerGroup().addTo(map);
        // Touch screens have no hover, and a tap must stay free to pick a Custom location
        const canHover = window.matchMedia('(hover: hover)').matches;
        const drawn = new Map<string, SkiMapFeature>();
        map.attributionControl?.addAttribution(OSM_ATTRIBUTION);
        map.attributionControl?.addAttribution(OPENSKIDATA_ATTRIBUTION);

        // Where a Lift crosses a Run, hovering names the Lift, which is drawn on top
        const liftHoverLayers: L.Path[] = [];

        const draw = (list: SkiMapFeature[]) => {
            let added = false;
            for (const feature of list) {
                if (drawn.has(feature.id)) continue;
                drawn.set(feature.id, feature);
                featureLayers(feature, convention, renderers).forEach(layer => group.addLayer(layer));
                if (canHover) {
                    const hover = hoverLayer(feature, convention, renderers);
                    group.addLayer(hover);
                    if (feature.kind === 'lift') liftHoverLayers.push(hover);
                }
                added = true;
            }
            if (!added) return;
            liftHoverLayers.forEach(layer => layer.bringToFront());
            setFeatures(new Map(drawn));
        };

        const loader = startSkiMapLoader({
            view: () => {
                const view = map.getBounds();
                return { zoom: map.getZoom(), south: view.getSouth(), west: view.getWest(), north: view.getNorth(), east: view.getEast() };
            },
            onFeatures: draw,
            onStatus: status => onStatusChangeRef.current(status),
        });
        map.on('moveend', loader.update);

        return () => {
            loader.stop();
            map.off('moveend', loader.update);
            group.remove();
            Object.values(renderers).forEach(renderer => renderer.remove());
            map.attributionControl?.removeAttribution(OSM_ATTRIBUTION);
            map.attributionControl?.removeAttribution(OPENSKIDATA_ATTRIBUTION);
            setFeatures(new Map());
        };
    }, [map, convention]);

    // Measured on screen at the current zoom, when the Custom location is picked and again as more Runs arrive
    useEffect(() => {
        const toScreen = (lat: number, lon: number) => map.latLngToLayerPoint([lat, lon]);
        const feature = customLocation ? featureAt(toScreen, customLocation.lat, customLocation.lon, features.values()) : null;
        onCustomLocationOnChangeRef.current(feature ? describeCustomLocationOn(feature, convention) : null);
    }, [map, customLocation, features, convention]);

    // Turned off: the Custom location is no longer said to be on anything
    useEffect(() => () => onCustomLocationOnChangeRef.current(null), []);

    return null;
}

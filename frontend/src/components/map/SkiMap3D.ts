/**
 * The Ski map on the 3D map: the same Runs and Lifts as the flat map's, from the same week-long cache,
 * drawn as MapLibre lines that drape over the terrain, with names on hover where there is a mouse.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Popup } from 'maplibre-gl';
import type { FeatureCollection, Geometry } from 'geojson';
import type { ExpressionSpecification, GeoJSONSource, LayerSpecification, Map as MapLibreMap, SourceSpecification } from 'maplibre-gl';
import type { SkiMapFeature } from '../../utils/skiMapData';
import type { DifficultyConvention } from '../../utils/difficultyColours';
import { OPENSKIDATA_ATTRIBUTION, OSM_ATTRIBUTION } from '../../utils/mapLayers';
import { EARTH_CIRCUMFERENCE, METRES_PER_DEGREE } from '../../utils/heightLines';
import {
    DASHED_DOWNHILL,
    LIFT_COLOUR,
    OTHER_RUNS,
    featureAt,
    hoverName,
    runStyle,
    startSkiMapLoader,
    type SkiMapStatus,
} from './skiMapFeatures';

const SOURCE = 'skiMap';

interface FeatureProperties {
    lift: boolean;
    area: boolean;
    colour: string;
    width: number;
    /** Which of DASH_PATTERNS the Run is dashed with, or '' for a solid line */
    dash: string;
    /** The SkiMapFeature's id, which hovering names in the language showing then */
    id: string;
}

/** Every dashed kind of Run, by its dashes in pixels and line width, as the flat map draws them */
const DASH_PATTERNS: { key: string; dashArray: string; width: number }[] = [
    { dashArray: DASHED_DOWNHILL, width: 3 },
    ...Object.values(OTHER_RUNS).filter(run => run.dashArray).map(run => ({ dashArray: run.dashArray!, width: 2.5 })),
].map(pattern => ({ ...pattern, key: `${pattern.dashArray}@${pattern.width}` }));

// MapLibre measures dashes in line widths, Leaflet in pixels
const dashesInWidths = (dashArray: string, width: number) => dashArray.split(' ').map(length => Number(length) / width);

const EMPTY: FeatureCollection<Geometry, FeatureProperties> = { type: 'FeatureCollection', features: [] };

export const SKI_MAP_SOURCES: Record<string, SourceSpecification> = {
    // MapLibre drops the Standard Base map's credit as part of this one, so OpenStreetMap is credited once
    [SOURCE]: { type: 'geojson', data: EMPTY, attribution: `${OSM_ATTRIBUTION} | ${OPENSKIDATA_ATTRIBUTION}` },
};

const isArea: ExpressionSpecification = ['==', ['get', 'area'], true];
const isLift: ExpressionSpecification = ['==', ['get', 'lift'], true];
const isRunLine: ExpressionSpecification = ['all', ['!', isArea], ['!', isLift]];
const LIFT_HOVER = 'ski-hover-lifts';
const RUN_HOVER = 'ski-hover-runs';

/** The Ski map's layers, in the flat map's order: areas, casings under Runs, then Lifts over everything; hidden until it is on */
export const SKI_MAP_LAYERS: LayerSpecification[] = [
    { id: 'ski-areas', type: 'fill', source: SOURCE, filter: isArea, paint: { 'fill-color': ['get', 'colour'], 'fill-opacity': 0.15 } },
    { id: 'ski-area-edges', type: 'line', source: SOURCE, filter: isArea, paint: { 'line-color': ['get', 'colour'], 'line-width': 1, 'line-opacity': 0.5 } },
    {
        id: 'ski-run-casings', type: 'line', source: SOURCE, filter: isRunLine,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 0.6 },
    },
    {
        id: 'ski-runs', type: 'line', source: SOURCE, filter: ['all', isRunLine, ['==', ['get', 'dash'], '']],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': ['get', 'colour'], 'line-width': ['get', 'width'] },
    },
    ...DASH_PATTERNS.map((pattern, i): LayerSpecification => ({
        id: `ski-runs-dashed-${i}`, type: 'line', source: SOURCE, filter: ['all', isRunLine, ['==', ['get', 'dash'], pattern.key]],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': ['get', 'colour'], 'line-width': pattern.width, 'line-dasharray': dashesInWidths(pattern.dashArray, pattern.width) },
    })),
    { id: 'ski-lift-casings', type: 'line', source: SOURCE, filter: isLift, paint: { 'line-color': '#ffffff', 'line-width': 4.5, 'line-opacity': 0.8 } },
    { id: 'ski-lifts', type: 'line', source: SOURCE, filter: isLift, paint: { 'line-color': LIFT_COLOUR, 'line-width': 2 } },
    // Short bars across the line, like the pylons on a trail map
    {
        id: 'ski-lift-pylons', type: 'line', source: SOURCE, filter: isLift, layout: { 'line-cap': 'butt' },
        paint: { 'line-color': LIFT_COLOUR, 'line-width': 7, 'line-dasharray': dashesInWidths('1.5 16', 7) },
    },
    // Invisible and a little wider, for the names on hover; Lifts above Runs, so where they cross the Lift is named
    { id: RUN_HOVER, type: 'line', source: SOURCE, filter: ['!', isLift], paint: { 'line-width': 10, 'line-opacity': 0 } },
    { id: LIFT_HOVER, type: 'line', source: SOURCE, filter: isLift, paint: { 'line-width': 10, 'line-opacity': 0 } },
].map(layer => ({ ...layer, layout: { ...layer.layout, visibility: 'none' } }) as LayerSpecification);

function toGeoJson(features: Iterable<SkiMapFeature>, convention: DifficultyConvention): FeatureCollection<Geometry, FeatureProperties> {
    const collection: FeatureCollection<Geometry, FeatureProperties> = { type: 'FeatureCollection', features: [] };
    for (const feature of features) {
        const coordinates = feature.coords.map(([lat, lon]) => [lon, lat]);
        const lift = feature.kind === 'lift';
        const style = lift ? null : runStyle(feature, convention);
        const width = style?.downhill ? 3 : 2.5;
        collection.features.push({
            type: 'Feature',
            geometry: feature.area ? { type: 'Polygon', coordinates: [coordinates] } : { type: 'LineString', coordinates },
            properties: {
                lift,
                area: feature.area,
                colour: style?.colour ?? LIFT_COLOUR,
                width,
                dash: style?.dashArray ? `${style.dashArray}@${width}` : '',
                id: feature.id,
            },
        });
    }
    return collection;
}

/** About the ground the flat map would show at this zoom around the centre: further toward the horizon isn't loaded */
function viewAround(map: MapLibreMap) {
    const centre = map.getCenter();
    // The flat map's zoom levels, as SKI_MAP_MIN_ZOOM is in
    const zoom = map.getZoom() + 1;
    const cos = Math.cos((centre.lat * Math.PI) / 180);
    const metresPerPixel = (EARTH_CIRCUMFERENCE * cos) / (256 * 2 ** zoom);
    const { clientWidth, clientHeight } = map.getContainer();
    const reach = 0.75 * Math.max(clientWidth, clientHeight) * metresPerPixel;
    const dLat = reach / METRES_PER_DEGREE;
    const dLon = reach / (METRES_PER_DEGREE * cos);
    return { zoom, south: centre.lat - dLat, north: centre.lat + dLat, west: centre.lng - dLon, east: centre.lng + dLon };
}

interface SkiMap3DOptions {
    enabled: boolean;
    convention: DifficultyConvention;
    customLocation: { lat: number; lon: number } | null | undefined;
    onStatusChange: (status: SkiMapStatus) => void;
    /** The Run or Lift the Custom location is on, or null */
    onCustomLocationOnChange: (feature: SkiMapFeature | null) => void;
}

/** Keeps the 3D map's Ski map drawn while it is on, once the style with SKI_MAP_SOURCES and SKI_MAP_LAYERS has loaded. */
export function useSkiMap3D(map: MapLibreMap | null, styleReady: Promise<void>, options: SkiMap3DOptions): void {
    const { enabled, convention, customLocation } = options;
    const [features, setFeatures] = useState<ReadonlyMap<string, SkiMapFeature>>(() => new Map());

    const onStatusChangeRef = useRef(options.onStatusChange);
    const onCustomLocationOnChangeRef = useRef(options.onCustomLocationOnChange);
    useLayoutEffect(() => {
        onStatusChangeRef.current = options.onStatusChange;
        onCustomLocationOnChangeRef.current = options.onCustomLocationOnChange;
    });

    useEffect(() => {
        if (!map || !enabled) return;
        let current = true;
        let stop = () => {};
        void styleReady.then(() => {
            if (!current) return;
            for (const layer of SKI_MAP_LAYERS) map.setLayoutProperty(layer.id, 'visibility', 'visible');
            const source = map.getSource(SOURCE) as GeoJSONSource;
            const drawn = new Map<string, SkiMapFeature>();
            const loader = startSkiMapLoader({
                view: () => viewAround(map),
                onFeatures: list => {
                    const before = drawn.size;
                    for (const feature of list) if (!drawn.has(feature.id)) drawn.set(feature.id, feature);
                    if (drawn.size === before) return;
                    source.setData(toGeoJson(drawn.values(), convention));
                    setFeatures(new Map(drawn));
                },
                onStatus: status => onStatusChangeRef.current(status),
            });
            map.on('moveend', loader.update);

            // Names on hover, where there is a mouse; a tap must stay free to pick a Custom location
            const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 10, className: 'resort-map-3d-hover' });
            const onMouseMove = (event: { point: { x: number; y: number }; lngLat: { lng: number; lat: number } }) => {
                const [hit] = map.queryRenderedFeatures([event.point.x, event.point.y], { layers: [LIFT_HOVER, RUN_HOVER] });
                const feature = hit && drawn.get(String(hit.properties.id));
                if (!feature) {
                    popup.remove();
                    return;
                }
                // Named as the mouse moves, so in the language showing then
                popup.setLngLat(event.lngLat).setText(hoverName(feature, convention)).addTo(map);
            };
            const canHover = window.matchMedia('(hover: hover)').matches;
            if (canHover) map.on('mousemove', onMouseMove);

            stop = () => {
                loader.stop();
                map.off('moveend', loader.update);
                map.off('mousemove', onMouseMove);
                popup.remove();
                // The map may have gone already, when the 3D map closes with the Ski map on
                if (!map.style) return;
                for (const layer of SKI_MAP_LAYERS) map.setLayoutProperty(layer.id, 'visibility', 'none');
                source.setData(EMPTY);
            };
        });
        return () => {
            current = false;
            stop();
            setFeatures(new Map());
        };
    }, [map, styleReady, enabled, convention]);

    // Measured on screen, when the Custom location is picked and again as more Runs arrive
    useEffect(() => {
        if (!map) return;
        const toScreen = (lat: number, lon: number) => map.project([lon, lat]);
        const feature = customLocation ? featureAt(toScreen, customLocation.lat, customLocation.lon, features.values()) : null;
        onCustomLocationOnChangeRef.current(feature);
    }, [map, customLocation, features]);

    // Turned off, or the 3D map closed: the Custom location is no longer said to be on anything
    useEffect(() => {
        if (!enabled) return;
        return () => onCustomLocationOnChangeRef.current(null);
    }, [enabled]);
}

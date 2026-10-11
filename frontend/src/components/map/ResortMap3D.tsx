/**
 * The 3D map: the visitor's Base map and Overlays, the same as the flat map's (docs/adr/0009), draped
 * over Mapterhorn's terrain and always shaded from it, with a Height line at each height being
 * forecast. It is loaded only when a visitor switches to it, and ResortMap holds the flat map, the
 * buttons around both and the layers panel (docs/adr/0008).
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addProtocol, Map as MapLibreMap, Marker, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl';
import type { GeoJSONSource, LayerSpecification, RasterTileSource, SourceSpecification, StyleSpecification } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import { useLanguage } from '../../hooks/useLanguage';
import {
    EARTH_CIRCUMFERENCE,
    METRES_PER_DEGREE,
    NO_HEIGHT_LINES,
    traceHeightLines,
    type HeightLine,
} from '../../utils/heightLines';
import { TERRAIN_ATTRIBUTION, TERRAIN_TILE_SIZE, TERRAIN_TILE_URL } from '../../utils/terrainTiles';
import {
    TERRAIN_OVERLAY_KINDS,
    TERRAIN_OVERLAY_MIN_ZOOM,
    drawTerrainOverlayTile,
    terrainTileCanvas,
    type TerrainOverlayKind,
    type TerrainOverlayOptions,
} from '../../utils/terrainOverlays';
import {
    EOX_ATTRIBUTION,
    EOX_MAX_NATIVE_ZOOM,
    EOX_URL,
    NATIONAL_MIN_ZOOM,
    NATIONAL_SOURCES,
    extentIntersects,
} from '../../utils/satelliteImagery';
import { OSM_ATTRIBUTION, type MapLayers } from '../../utils/mapLayers';
import type { MapRotation } from '../../utils/mapRotation';
import type { DifficultyConvention } from '../../utils/difficultyColours';
import type { UnitSystem } from '../../utils/unitConversion';
import { SKI_MAP_LAYERS, SKI_MAP_SOURCES, useSkiMap3D } from './SkiMap3D';
import type { SkiMapStatus } from './skiMapFeatures';
import {
    CUSTOM_LOCATION_DOT_HTML,
    CUSTOM_LOCATION_DOT_SIZE,
    CustomLocationPopupContent,
    DOUBLE_CLICK_MS,
    ResortPopupContent,
} from './mapMarkers';

// Bundlers move MapLibre's code away from the worker file it expects beside it, so point it there
setWorkerUrl(workerUrl);

/** Where a map is looking, in the flat map's zoom levels (MapLibre's are one lower for the same scale) */
export interface MapView {
    lat: number;
    lon: number;
    zoom: number;
}

const INITIAL_PITCH = 55;
// Enough to look across a valley at the face opposite; above this the camera mostly sees sky
const MAX_PITCH = 75;
// The flat map's maxZoom, 18
const MAX_ZOOM = 17;
// Mapterhorn's sharper tiles reach about z15 where it has them; elsewhere a missing tile falls back to a coarser one
const TERRAIN_MAX_ZOOM = 15;
const EXAGGERATION_MIN = 1;
const EXAGGERATION_MAX = 5;
const EXAGGERATION_STEP = 0.5;
// A click whose ground point projects back further than this from it was on the sky
const SKY_CLICK_TOLERANCE_PX = 20;
// Leaflet's default marker, so the Resort looks the same on both maps
const RESORT_MARKER_HEIGHT = 41;
// The flat map's zoom 13, where 5 km of Height lines span a few hundred pixels
const HEIGHT_LABEL_MIN_ZOOM = 12;
// Violet, which nothing on the OpenStreetMap map is drawn in as strongly (water is blue, roads orange)
const HEIGHT_LINE_COLOUR = '#7e22ce';

/**
 * The terrain Overlays are drawn in the browser by the same code as the flat map's tiles, and handed to
 * MapLibre through this made-up scheme: terrain-overlay://<kind>/<z>/<x>/<y>?units=<units>&base=<base map>
 */
const TERRAIN_OVERLAY_SCHEME = 'terrain-overlay';
const TERRAIN_OVERLAY_TILE = /^terrain-overlay:\/\/(\w+)\/(\d+)\/(\d+)\/(\d+)\?units=(\w+)&base=(\w+)$/;

addProtocol(TERRAIN_OVERLAY_SCHEME, async ({ url }) => {
    const match = TERRAIN_OVERLAY_TILE.exec(url);
    if (!match) throw new Error(`Not a terrain Overlay tile: ${url}`);
    const [, kind, z, x, y, units, base] = match;
    const canvas = terrainTileCanvas();
    const options: TerrainOverlayOptions = { unitSystem: units === 'imperial' ? 'imperial' : 'metric', onSatellite: base === 'satellite' };
    await drawTerrainOverlayTile(kind as TerrainOverlayKind, canvas, Number(z), Number(x), Number(y), options);
    return { data: await createImageBitmap(canvas) };
});

const overlayTiles = (kind: TerrainOverlayKind, { unitSystem, onSatellite }: TerrainOverlayOptions): string[] =>
    [`${TERRAIN_OVERLAY_SCHEME}://${kind}/{z}/{x}/{y}?units=${unitSystem}&base=${onSatellite ? 'satellite' : 'standard'}`];

// MapLibre's own hillshade always shades the 3D map, so only the canvas-drawn kinds are Overlays here
const DRAPED_OVERLAYS = TERRAIN_OVERLAY_KINDS.filter(kind => kind !== 'hillshade');
// Drawn bottom to top, as on the flat map: a Terrain colouring, then Flats, then contours
const DRAPED_ORDER: TerrainOverlayKind[] = ['slopeAngle', 'gradient', 'aspect', 'heightTint', 'flats', 'contours'];

const nationalLayerId = (sourceId: string, extent: number) => `satellite-${sourceId}-${extent}`;

/** The whole map, starting with the visitor's Base map and terrain Overlays showing; the Ski map shows once it loads */
function buildStyle(options: TerrainOverlayOptions, overlays: readonly string[]): StyleSpecification {
    const sources: Record<string, SourceSpecification> = {
        osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            maxzoom: 19,
            attribution: OSM_ATTRIBUTION,
        },
        eox: { type: 'raster', tiles: [EOX_URL], tileSize: 256, maxzoom: EOX_MAX_NATIVE_ZOOM, attribution: EOX_ATTRIBUTION },
        // MapLibre wants the terrain and the shading drawn from separate sources
        terrain: {
            type: 'raster-dem',
            tiles: [TERRAIN_TILE_URL],
            tileSize: TERRAIN_TILE_SIZE,
            encoding: 'terrarium',
            maxzoom: TERRAIN_MAX_ZOOM,
            attribution: TERRAIN_ATTRIBUTION,
        },
        hillshade: {
            type: 'raster-dem',
            tiles: [TERRAIN_TILE_URL],
            tileSize: TERRAIN_TILE_SIZE,
            encoding: 'terrarium',
            maxzoom: TERRAIN_MAX_ZOOM,
            attribution: TERRAIN_ATTRIBUTION,
        },
        heightLines: { type: 'geojson', data: NO_HEIGHT_LINES.lines },
        ...SKI_MAP_SOURCES,
    };
    const hidden = { visibility: 'none' } as const;
    const shownIf = (on: boolean) => ({ visibility: on ? 'visible' : 'none' } as const);
    const layers: LayerSpecification[] = [
        { id: 'osm', type: 'raster', source: 'osm', layout: shownIf(!options.onSatellite) },
        { id: 'eox', type: 'raster', source: 'eox', layout: shownIf(options.onSatellite) },
    ];

    // The national aerial photos, each fenced to its rectangles, later sources on top as on the flat map
    for (const source of NATIONAL_SOURCES) {
        source.extents.forEach(([[south, west], [north, east]], i) => {
            const id = nationalLayerId(source.id, i);
            sources[id] = {
                type: 'raster',
                tiles: [source.url],
                tileSize: 256,
                minzoom: NATIONAL_MIN_ZOOM,
                maxzoom: source.maxNativeZoom,
                bounds: [west, south, east, north],
                attribution: source.attribution,
            };
            layers.push({ id, type: 'raster', source: id, layout: hidden });
        });
    }

    layers.push({
        id: 'hillshade',
        type: 'hillshade',
        source: 'hillshade',
        paint: { 'hillshade-exaggeration': 0.4, 'hillshade-shadow-color': '#2b2b2b' },
    });

    for (const kind of DRAPED_ORDER) {
        sources[`overlay-${kind}`] = {
            type: 'raster',
            tiles: overlayTiles(kind, options),
            tileSize: 256,
            // Steepness is left off where the terrain under the tile is too coarse to tell it, so it stops toward the horizon
            minzoom: TERRAIN_OVERLAY_MIN_ZOOM[kind],
            maxzoom: MAX_ZOOM + 1,
            attribution: TERRAIN_ATTRIBUTION,
        };
        layers.push({ id: `overlay-${kind}`, type: 'raster', source: `overlay-${kind}`, layout: shownIf(overlays.includes(kind)) });
    }

    layers.push(...SKI_MAP_LAYERS);

    layers.push(
        // A white edge keeps the lines readable over dark forest and shadow
        {
            id: 'height-line-casing',
            type: 'line',
            source: 'heightLines',
            layout: { 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['case', ['get', 'bold'], 1, 0] },
            paint: {
                'line-color': '#ffffff',
                'line-width': ['case', ['get', 'bold'], 6.5, 4.5],
                'line-opacity': ['*', ['get', 'fade'], ['case', ['get', 'bold'], 0.85, 0.6]],
            },
        },
        {
            id: 'height-line',
            type: 'line',
            source: 'heightLines',
            layout: { 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['case', ['get', 'bold'], 1, 0] },
            paint: {
                'line-color': HEIGHT_LINE_COLOUR,
                'line-width': ['case', ['get', 'bold'], 3.5, 2],
                'line-opacity': ['*', ['get', 'fade'], ['case', ['get', 'bold'], 1, 0.75]],
            },
        },
    );

    return { version: 8, sources, layers, terrain: { source: 'terrain', exaggeration: EXAGGERATION_MIN } };
}

/** Shows the Base map's layers, with each national source only where its photos are in view, so the map credits only what it shows */
function showBaseMap(map: MapLibreMap, onSatellite: boolean): void {
    const visibility = (on: boolean) => (on ? 'visible' : 'none');
    map.setLayoutProperty('osm', 'visibility', visibility(!onSatellite));
    map.setLayoutProperty('eox', 'visibility', visibility(onSatellite));
    // The flat map's zoom levels, as NATIONAL_MIN_ZOOM is in
    const closeEnough = map.getZoom() + 1 >= NATIONAL_MIN_ZOOM;
    const bounds = map.getBounds();
    const view = { south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() };
    for (const source of NATIONAL_SOURCES) {
        source.extents.forEach((extent, i) => {
            const shown = onSatellite && closeEnough && extentIntersects(extent, view);
            const id = nationalLayerId(source.id, i);
            if (map.getLayoutProperty(id, 'visibility') !== visibility(shown)) map.setLayoutProperty(id, 'visibility', visibility(shown));
        });
    }
}

// How far the camera backs off at a time, and how far at most, when exaggerated terrain blocks its view
const ZOOM_OUT_STEP = 0.25;
const MAX_ZOOM_OUT = 5;
const SIGHT_LINE_SAMPLES = 12;
// Only the camera's end of its line of sight matters: slopes near the centre may rise across it and still look right
const SIGHT_LINE_CHECKED = 0.8;

/**
 * Exaggerated terrain can rise around the camera and between it and the point it looks at, leaving the
 * camera inside a mountain or pressed against one. MapLibre only checks the ground straight below the
 * camera, so this backs the camera off until the camera's end of its line of sight clears the terrain.
 */
function zoomOutOverTerrain(map: MapLibreMap): void {
    const centre = map.getCenter();
    const centreAltitude = map.getCenterElevation();
    const pitch = (map.getPitch() * Math.PI) / 180;
    const bearing = (map.getBearing() * Math.PI) / 180;
    const fov = (map.getVerticalFieldOfView() * Math.PI) / 180;
    // As MapLibre works it out, in pixels
    const cameraDistancePixels = (0.5 / Math.tan(fov / 2)) * map.getContainer().clientHeight;
    const metresPerLonDegree = METRES_PER_DEGREE * Math.cos((centre.lat * Math.PI) / 180);

    const sightLineClear = (zoom: number): boolean => {
        const metresPerPixel = (EARTH_CIRCUMFERENCE * Math.cos((centre.lat * Math.PI) / 180)) / (512 * 2 ** zoom);
        const distance = cameraDistancePixels * metresPerPixel;
        const across = distance * Math.sin(pitch);
        const up = distance * Math.cos(pitch);
        // Walk from the camera, which is behind the centre, towards the centre
        for (let i = 0; i < SIGHT_LINE_SAMPLES; i++) {
            const remaining = 1 - (i / SIGHT_LINE_SAMPLES) * SIGHT_LINE_CHECKED;
            const lon = centre.lng - (Math.sin(bearing) * across * remaining) / metresPerLonDegree;
            const lat = centre.lat - (Math.cos(bearing) * across * remaining) / METRES_PER_DEGREE;
            const ground = map.queryTerrainElevation([lon, lat]) ?? 0;
            if (ground > centreAltitude + up * remaining) return false;
        }
        return true;
    };

    const zoom = map.getZoom();
    for (let next = zoom; next >= Math.max(map.getMinZoom(), zoom - MAX_ZOOM_OUT); next -= ZOOM_OUT_STEP) {
        if (sightLineClear(next)) {
            if (next < zoom) map.easeTo({ zoom: next });
            return;
        }
    }
}

export interface ResortMap3DProps {
    /** Where the camera starts, carried over from the flat map */
    initialView: MapView;
    onViewChange: (view: MapView) => void;
    lat: number;
    lon: number;
    resortName?: string;
    className?: string;
    onMapClick?: (lat: number, lon: number) => void;
    customLocation?: { lat: number; lon: number } | null;
    /** The height the Custom location is forecast at, or null until the forecast reports it */
    customElevationText?: string | null;
    heightLines: readonly HeightLine[];
    /** The visitor's Base map and Overlays, shared with the flat map */
    layers: MapLayers;
    unitSystem: UnitSystem;
    /** How downhill Runs are coloured: the convention of the Resort's country */
    convention: DifficultyConvention;
    /** How a sideways right-drag turns the map; fixed for the map's life, so the parent keys it by this */
    rotation: MapRotation;
    onSkiMapStatusChange: (status: SkiMapStatus) => void;
    /** What the Custom location is on, e.g. "On Peak to Creek, blue run", reported to and shown back from the parent */
    customLocationOn: string | null;
    onCustomLocationOnChange: (text: string | null) => void;
}

export default function ResortMap3D({
    initialView,
    onViewChange,
    lat,
    lon,
    resortName,
    className = '',
    onMapClick,
    customLocation,
    customElevationText,
    heightLines,
    layers,
    unitSystem,
    convention,
    rotation,
    onSkiMapStatusChange,
    customLocationOn,
    onCustomLocationOnChange,
}: ResortMap3DProps): JSX.Element {
    const { t } = useLanguage();
    const containerRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<MapLibreMap | null>(null);
    // Resolves once the style is parsed, when its sources can be changed
    const [styleReady, setStyleReady] = useState<Promise<void>>(() => Promise.resolve());
    const [exaggeration, setExaggeration] = useState(EXAGGERATION_MIN);
    // Popups are filled by React through portals into these
    const [resortPopupNode] = useState(() => document.createElement('div'));
    const [customPopupNode] = useState(() => document.createElement('div'));
    const resortMarker = useRef<Marker | null>(null);
    const customMarker = useRef<Marker | null>(null);
    const hasCustomLocation = customLocation !== null && customLocation !== undefined;
    const onSatellite = layers.baseMap === 'satellite';

    // The latest callbacks and Base map, for the map's listeners
    const onMapClickRef = useRef(onMapClick);
    onMapClickRef.current = onMapClick;
    const onViewChangeRef = useRef(onViewChange);
    onViewChangeRef.current = onViewChange;
    const onSatelliteRef = useRef(onSatellite);
    onSatelliteRef.current = onSatellite;

    // Create the map once; the parent keys this component by Resort and by rotation
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const created = new MapLibreMap({
            container,
            style: buildStyle({ unitSystem, onSatellite }, layers.overlays),
            center: [initialView.lon, initialView.lat],
            zoom: initialView.zoom - 1,
            pitch: INITIAL_PITCH,
            bearing: 0,
            maxZoom: MAX_ZOOM,
            maxPitch: MAX_PITCH,
            aroundCenter: rotation === 'orbital',
            attributionControl: { compact: true },
        });
        setStyleReady(new Promise((resolve) => created.once('style.load', () => resolve())));
        created.addControl(new NavigationControl({ visualizePitch: true }), 'top-left');

        const resortElement = document.createElement('img');
        resortElement.src = markerIcon;
        resortElement.srcset = `${markerIcon2x} 2x`;
        resortElement.width = 25;
        resortElement.height = RESORT_MARKER_HEIGHT;
        resortElement.alt = '';
        resortElement.className = 'resort-map-3d-marker';
        resortMarker.current = new Marker({ element: resortElement, anchor: 'bottom' })
            .setLngLat([lon, lat])
            .setPopup(new Popup({ offset: RESORT_MARKER_HEIGHT - 4 }).setDOMContent(resortPopupNode))
            .addTo(created);

        let pendingClick: number | undefined;
        created.on('click', (event) => {
            // A click on a marker opens its popup instead
            const target = event.originalEvent.target as Node;
            const markers = [resortMarker.current, customMarker.current];
            if (markers.some((marker) => marker?.getElement().contains(target))) return;
            const back = created.project(event.lngLat);
            if (Math.hypot(back.x - event.point.x, back.y - event.point.y) > SKY_CLICK_TOLERANCE_PX) return;
            window.clearTimeout(pendingClick);
            const { lat: clickedLat, lng: clickedLon } = event.lngLat;
            pendingClick = window.setTimeout(() => onMapClickRef.current?.(clickedLat, clickedLon), DOUBLE_CLICK_MS);
        });
        created.on('dblclick', () => window.clearTimeout(pendingClick));
        // Zoomed far out, the lines' labels crowd onto one another
        const hideLabelsWhenFar = (): void => {
            container.classList.toggle('resort-map-hide-height-labels', created.getZoom() < HEIGHT_LABEL_MIN_ZOOM);
        };
        hideLabelsWhenFar();
        created.on('zoom', hideLabelsWhenFar);
        created.on('moveend', () => {
            const centre = created.getCenter();
            onViewChangeRef.current({ lat: centre.lat, lon: centre.lng, zoom: created.getZoom() + 1 });
            if (created.isStyleLoaded()) showBaseMap(created, onSatelliteRef.current);
        });

        setMap(created);
        return () => {
            window.clearTimeout(pendingClick);
            created.remove();
        };
        // The map starts where the flat map was and then moves on its own
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The Base map and Overlays follow the visitor's choice, which the layers panel can change while the map is open
    const overlaysKey = layers.overlays.join();
    useEffect(() => {
        if (!map) return;
        let current = true;
        void styleReady.then(() => {
            if (!current) return;
            showBaseMap(map, onSatellite);
            const on = overlaysKey.split(',');
            for (const kind of DRAPED_OVERLAYS) {
                map.setLayoutProperty(`overlay-${kind}`, 'visibility', on.includes(kind) ? 'visible' : 'none');
            }
        });
        return () => { current = false; };
    }, [map, styleReady, onSatellite, overlaysKey]);

    // Contours are drawn in the visitor's units, and white over Satellite
    useEffect(() => {
        if (!map) return;
        let current = true;
        void styleReady.then(() => {
            if (!current) return;
            const source = map.getSource('overlay-contours') as RasterTileSource | undefined;
            const tiles = overlayTiles('contours', { unitSystem, onSatellite });
            if (source && source.tiles?.[0] !== tiles[0]) source.setTiles(tiles);
        });
        return () => { current = false; };
    }, [map, styleReady, unitSystem, onSatellite]);

    useSkiMap3D(map, styleReady, {
        enabled: layers.overlays.includes('skiMap'),
        convention,
        customLocation,
        onStatusChange: onSkiMapStatusChange,
        onCustomLocationOnChange,
    });

    // The Resort's marker is dimmed while a Custom location is being forecast
    useEffect(() => {
        resortMarker.current?.setOpacity(hasCustomLocation ? '0.4' : '1');
    }, [map, hasCustomLocation]);

    const customLat = customLocation?.lat;
    const customLon = customLocation?.lon;
    useEffect(() => {
        if (!map || customLat === undefined || customLon === undefined) return;
        const element = document.createElement('div');
        element.className = 'resort-map-3d-marker';
        element.style.width = `${CUSTOM_LOCATION_DOT_SIZE}px`;
        element.style.height = `${CUSTOM_LOCATION_DOT_SIZE}px`;
        element.innerHTML = CUSTOM_LOCATION_DOT_HTML;
        const marker = new Marker({ element, anchor: 'center' })
            .setLngLat([customLon, customLat])
            .setPopup(new Popup({ offset: CUSTOM_LOCATION_DOT_SIZE / 2 }).setDOMContent(customPopupNode))
            .addTo(map);
        customMarker.current = marker;
        return () => {
            marker.remove();
            customMarker.current = null;
        };
    }, [map, customLat, customLon, customPopupNode]);

    useEffect(() => {
        if (!map) return;
        let current = true;
        void styleReady.then(() => {
            if (!current) return;
            map.setTerrain({ source: 'terrain', exaggeration });
            zoomOutOverTerrain(map);
        });
        return () => { current = false; };
    }, [map, styleReady, exaggeration]);

    // Height lines are traced around the point being forecast, and fade out away from it
    const pointLat = customLat ?? lat;
    const pointLon = customLon ?? lon;
    const heightLinesKey = JSON.stringify(heightLines);
    useEffect(() => {
        if (!map) return;
        // The old lines go at once rather than when the new ones are traced
        (map.getSource('heightLines') as GeoJSONSource | undefined)?.setData(NO_HEIGHT_LINES.lines);
        const controller = new AbortController();
        const labels: Marker[] = [];
        const lines: HeightLine[] = JSON.parse(heightLinesKey);
        void Promise.all([traceHeightLines({ lat: pointLat, lon: pointLon }, lines, controller.signal), styleReady])
            .then(([traced]) => {
                if (controller.signal.aborted) return;
                (map.getSource('heightLines') as GeoJSONSource | undefined)?.setData(traced.lines);
                for (const label of traced.labels) {
                    const element = document.createElement('div');
                    element.className = `resort-map-height-label${label.bold ? ' resort-map-height-label-bold' : ''}`;
                    element.textContent = label.label;
                    labels.push(
                        new Marker({ element, anchor: 'center', opacity: label.bold ? '1' : '0.75', opacityWhenCovered: '0' })
                            .setLngLat([label.lon, label.lat])
                            .addTo(map)
                    );
                }
            })
            .catch((error: unknown) => {
                if (!controller.signal.aborted) console.warn('Could not trace Height lines', error);
            });
        return () => {
            controller.abort();
            labels.forEach((label) => label.remove());
        };
    }, [map, styleReady, pointLat, pointLon, heightLinesKey]);

    return (
        <>
            <div ref={containerRef} className={`h-full rounded-xl shadow-lg ${className}`} style={{ zIndex: 0 }} />

            <label className="resort-map-exaggeration" title={t('map.exaggeration')}>
                <span className="sr-only">{t('map.exaggeration')}</span>
                <input
                    type="range"
                    min={EXAGGERATION_MIN}
                    max={EXAGGERATION_MAX}
                    step={EXAGGERATION_STEP}
                    value={exaggeration}
                    onChange={(event) => setExaggeration(Number(event.target.value))}
                />
                <span className="resort-map-exaggeration-value">{exaggeration}×</span>
            </label>

            {createPortal(
                <ResortPopupContent resortName={resortName} hasCustomLocation={hasCustomLocation} />,
                resortPopupNode
            )}
            {customLocation && createPortal(
                <CustomLocationPopupContent
                    lat={customLocation.lat}
                    lon={customLocation.lon}
                    elevationText={customElevationText}
                    onText={customLocationOn}
                />,
                customPopupNode
            )}
        </>
    );
}

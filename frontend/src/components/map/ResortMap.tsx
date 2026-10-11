import { Component, Suspense, lazy, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useFullscreenView } from '../../hooks/useFullscreenView';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useLanguage } from '../../hooks/useLanguage';
import {
    DEFAULT_MAP_LAYERS,
    MAP_LAYERS_STORAGE_KEY,
    OSM_ATTRIBUTION,
    sanitizeMapLayers,
    terrainColouring,
    type MapLayers,
    type OverlayId,
} from '../../utils/mapLayers';
import { difficultyConvention } from '../../utils/difficultyColours';
import { SKI_MAP_MIN_ZOOM } from '../../utils/skiMapData';
import { CONTOURS_MIN_ZOOM, STEEPNESS_MIN_ZOOM } from '../../utils/terrainRendering';
import type { UnitSystem } from '../../utils/unitConversion';
import type { HeightLine } from '../../utils/heightLines';
import type { MapRotation, MapTilt } from '../../utils/mapRotation';
import type { MapView } from './ResortMap3D';
import { SatelliteBaseMap } from './SatelliteBaseMap';
import { TerrainOverlay } from './TerrainOverlay';
import { SkiMapOverlay } from './SkiMapOverlay';
import type { SkiMapStatus } from './skiMapFeatures';
import { MapLayersPanel } from './MapLayersPanel';
import { MapLegend } from './MapLegend';
import { CursorReadout } from './CursorReadout';
import { useTerrainReadout } from '../../hooks/useTerrainReadout';
import type { TerrainPoint } from '../../utils/terrainAtPoint';
import {
    CUSTOM_LOCATION_DOT_HTML,
    CUSTOM_LOCATION_DOT_SIZE,
    CustomLocationPopupContent,
    DOUBLE_CLICK_MS,
    ResortPopupContent,
} from './mapMarkers';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// The 3D map and MapLibre behind it are only downloaded the first time a visitor switches to it (docs/adr/0008)
const ResortMap3D = lazy(() => import('./ResortMap3D'));

// Fix Leaflet's default marker icon issue with bundlers (Vite/Webpack)
// Import icons locally instead of relying on CDN for production reliability
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Custom red marker for clicked location
const customLocationIcon = L.divIcon({
    className: 'custom-location-marker',
    html: CUSTOM_LOCATION_DOT_HTML,
    iconSize: [CUSTOM_LOCATION_DOT_SIZE, CUSTOM_LOCATION_DOT_SIZE],
    iconAnchor: [CUSTOM_LOCATION_DOT_SIZE / 2, CUSTOM_LOCATION_DOT_SIZE / 2],
    popupAnchor: [0, -CUSTOM_LOCATION_DOT_SIZE / 2],
});

// Marks the history entry pushed on entering fullscreen, so Back closes the map instead of leaving the page
const FULLSCREEN_HISTORY_KEY = 'resortMapFullscreen';

// Close enough for a typical Resort, a small hill of about 200 m vertical, to fill the map; big Resorts open cropped
const INITIAL_ZOOM = 14;

type MapSize = 'small' | 'expanded' | 'fullscreen';

// MapLibre draws with WebGL2, so without it the 3D map is never offered
function supportsWebGL2(): boolean {
    try {
        const context = document.createElement('canvas').getContext('webgl2');
        // Browsers allow only a few contexts at once, so give this one back
        context?.getExtension('WEBGL_lose_context')?.loseContext();
        return context !== null;
    } catch {
        return false;
    }
}

interface ResortMapProps {
    lat: number;
    lon: number;
    resortName?: string;
    className?: string;
    // Custom location feature props
    onMapClick?: (lat: number, lon: number) => void;
    customLocation?: { lat: number; lon: number } | null;
    /** The height the Custom location is forecast at, e.g. "2100m (ground 1845m)", or null until the forecast reports it */
    customElevationText?: string | null;
    /** ISO code of the Resort's country (for a Saved location, its nearest Resort's): picks the Difficulty colours */
    country?: string;
    /** Contour lines are spaced and labelled in the visitor's units */
    unitSystem: UnitSystem;
    /** Drawn on the 3D map only */
    heightLines: readonly HeightLine[];
    /** How a right-drag turns and tilts the 3D map */
    rotation: MapRotation;
    tilt: MapTilt;
}

// Reports the zoom whenever it changes, so the layers panel can say when an Overlay needs the map closer in
function ZoomTracker({ onZoom }: { onZoom: (zoom: number) => void }): null {
    const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
    return null;
}

// Inner component reporting the ground under the mouse, for the cursor readout
function PointerTracker({ onPointer }: { onPointer: (point: TerrainPoint | null) => void }): null {
    const map = useMapEvents({
        mousemove: (e) => onPointer({ lat: e.latlng.lat, lon: e.latlng.lng, zoom: map.getZoom() }),
        mouseout: () => onPointer(null),
    });
    return null;
}

// Inner component reporting where the flat map is looking, so the 3D map can start there
function MapViewTracker({ onChange }: { onChange: (view: MapView) => void }): null {
    const map = useMapEvents({
        moveend: () => {
            const centre = map.getCenter();
            onChange({ lat: centre.lat, lon: centre.lng, zoom: map.getZoom() });
        },
    });
    return null;
}

// Inner component to invalidate map size whenever its container resizes
function MapResizeHandler(): null {
    const map = useMap();
    useEffect(() => {
        // Covers every frame of the expand transition as well as entering/leaving fullscreen
        const observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(map.getContainer());
        return () => observer.disconnect();
    }, [map]);
    return null;
}

// Inner component to handle map click events
function MapClickHandler({ onClick }: { onClick: (lat: number, lon: number) => void }): null {
    const pendingClick = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(pendingClick.current), []);
    useMapEvents({
        click: (e) => {
            window.clearTimeout(pendingClick.current);
            pendingClick.current = window.setTimeout(() => onClick(e.latlng.lat, e.latlng.lng), DOUBLE_CLICK_MS);
        },
        dblclick: () => {
            window.clearTimeout(pendingClick.current);
        },
    });
    return null;
}

// Shown in place of the 3D map when its code fails to load, e.g. offline or after a new release
class Map3DErrorBoundary extends Component<{ message: string; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError(): { failed: boolean } {
        return { failed: true };
    }

    render(): ReactNode {
        return this.state.failed ? <div className="resort-map-message">{this.props.message}</div> : this.props.children;
    }
}

export function ResortMap({
    lat,
    lon,
    resortName,
    className = '',
    onMapClick,
    customLocation,
    customElevationText,
    country,
    unitSystem,
    heightLines,
    rotation,
    tilt,
}: ResortMapProps): JSX.Element {
    const { t } = useLanguage();
    const hasCustomLocation = customLocation !== null && customLocation !== undefined;
    const [isExpanded, setIsExpanded] = useState(false);
    // While fullscreen: Back and Esc close the map, and the page behind it can't scroll
    const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreenView(FULLSCREEN_HISTORY_KEY);
    // Fullscreen is only offered once expanded, so leaving it returns to the expanded map
    const size: MapSize = isFullscreen ? 'fullscreen' : isExpanded ? 'expanded' : 'small';

    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    // One Base map and any Overlays, the same on every map in this browser, flat and 3D
    const [storedLayers, setStoredLayers] = useLocalStorage<unknown>(MAP_LAYERS_STORAGE_KEY, DEFAULT_MAP_LAYERS);
    const layers = useMemo(() => sanitizeMapLayers(storedLayers), [storedLayers]);
    const setLayers = useCallback((next: MapLayers) => setStoredLayers(next), [setStoredLayers]);
    const isOn = (overlay: OverlayId) => layers.overlays.includes(overlay);
    const colouring = terrainColouring(layers);
    const onSatellite = layers.baseMap === 'satellite';
    const convention = useMemo(() => difficultyConvention(country), [country]);

    const [zoom, setZoom] = useState(INITIAL_ZOOM);
    const [skiMapStatus, setSkiMapStatus] = useState<SkiMapStatus>('loading');
    // e.g. "On Peak to Creek, blue run" when the Custom location is on a Run or Lift of the Ski map
    const [customLocationOn, setCustomLocationOn] = useState<string | null>(null);

    const hints: Partial<Record<OverlayId, string>> = {
        skiMap: zoom < SKI_MAP_MIN_ZOOM ? 'Zoom in to see runs'
            : skiMapStatus === 'unavailable' ? 'Unavailable, retrying'
            : skiMapStatus === 'loading' ? 'Loading...'
            : undefined,
        contours: zoom < CONTOURS_MIN_ZOOM ? 'Zoom in to see contours' : undefined,
    };
    // Steepness needs terrain about 30 m or finer (docs/adr/0009)
    for (const steepness of ['slopeAngle', 'gradient', 'aspect', 'flats'] as const) {
        if (zoom < STEEPNESS_MIN_ZOOM) hints[steepness] = 'Zoom in to see slopes';
    }

    // The layers panel closes on a click or tap anywhere outside it, or on Esc
    const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
    const layersPanelRef = useRef<HTMLDivElement>(null);
    const layersButtonRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!isLayersPanelOpen) return;
        const closeOutside = (e: PointerEvent) => {
            const target = e.target as Node;
            if (!layersPanelRef.current?.contains(target) && !layersButtonRef.current?.contains(target)) {
                setIsLayersPanelOpen(false);
            }
        };
        const closeOnEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsLayersPanelOpen(false);
        };
        document.addEventListener('pointerdown', closeOutside);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOutside);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isLayersPanelOpen]);

    // The 3D map is never remembered: every detail view opens on the flat map
    const [is3D, setIs3D] = useState(false);
    const [canShow3D] = useState(supportsWebGL2);
    // Where either map was last looking, so switching keeps the same place in view
    const view = useRef<MapView>({ lat, lon, zoom: INITIAL_ZOOM });
    const setView = useCallback((next: MapView) => {
        view.current = next;
    }, []);
    // The 3D map's zoom at the centre also decides the layers panel's zoom hints
    const setView3D = useCallback((next: MapView) => {
        view.current = next;
        setZoom(next.zoom);
    }, []);

    // The terrain under the mouse, where there is one; a tap on a touch screen picks a Custom location instead
    const [canHover] = useState(() => window.matchMedia('(hover: hover)').matches);
    const { reading, pointAt } = useTerrainReadout();

    const toggle3D = useCallback(() => {
        setIsLayersPanelOpen(false);
        pointAt(null);
        // The flat map comes back where the 3D map was, which the zoom hints must know
        if (is3D) setZoom(Math.round(view.current.zoom));
        // The next 3D map starts facing north at its usual tilt, like the flat map it is switched from
        view.current = { lat: view.current.lat, lon: view.current.lon, zoom: view.current.zoom };
        setIs3D(!is3D);
    }, [is3D, pointAt]);

    return (
        // The outer box keeps the map's place in the page while the frame inside it goes fullscreen
        <div className={`resort-map-container ${size === 'small' ? '' : 'resort-map-expanded'}`}>
            <div className={`resort-map-frame ${isFullscreen ? 'resort-map-fullscreen' : ''}`}>
                {is3D ? (
                    <Map3DErrorBoundary message={t('map.failed3d')}>
                        <Suspense fallback={<div className="resort-map-message">{t('map.loading3d')}</div>}>
                            {/* Remade, facing the same way, when a drag setting changes, which MapLibre only takes when a map is created */}
                            <ResortMap3D
                                key={`${rotation}-${tilt}`}
                                initialView={view.current}
                                onViewChange={setView3D}
                                lat={lat}
                                lon={lon}
                                resortName={resortName}
                                className={className}
                                onMapClick={onMapClick}
                                customLocation={customLocation}
                                customElevationText={customElevationText}
                                heightLines={heightLines}
                                layers={layers}
                                unitSystem={unitSystem}
                                convention={convention}
                                rotation={rotation}
                                tilt={tilt}
                                onSkiMapStatusChange={setSkiMapStatus}
                                customLocationOn={customLocationOn}
                                onCustomLocationOnChange={setCustomLocationOn}
                                onPointerMove={canHover ? pointAt : undefined}
                            />
                        </Suspense>
                    </Map3DErrorBoundary>
                ) : (
                    <MapContainer
                        center={[view.current.lat, view.current.lon]}
                        zoom={Math.round(view.current.zoom)}
                        maxZoom={18}
                        scrollWheelZoom={true}
                        className={`h-full rounded-xl shadow-lg ${className}`}
                        style={{ zIndex: 0 }}
                    >
                        {/* Standard is plain OpenStreetMap. OpenSkiMap looks better, but its terms forbid other sites using its tiles;
                            OpenSnowMap's ski run and lift overlay was tried and dropped for how it looked, so the Ski map draws its own. */}
                        {onSatellite ? (
                            <SatelliteBaseMap />
                        ) : (
                            <TileLayer attribution={OSM_ATTRIBUTION} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        )}

                        {isOn('hillshade') && <TerrainOverlay kind="hillshade" unitSystem={unitSystem} onSatellite={onSatellite} />}
                        {colouring && <TerrainOverlay kind={colouring} unitSystem={unitSystem} onSatellite={onSatellite} />}
                        {isOn('flats') && <TerrainOverlay kind="flats" unitSystem={unitSystem} onSatellite={onSatellite} />}
                        {isOn('contours') && <TerrainOverlay kind="contours" unitSystem={unitSystem} onSatellite={onSatellite} />}
                        {isOn('skiMap') && (
                            <SkiMapOverlay
                                convention={convention}
                                customLocation={customLocation}
                                onStatusChange={setSkiMapStatus}
                                onCustomLocationOnChange={setCustomLocationOn}
                            />
                        )}

                        <ZoomTracker onZoom={setZoom} />

                        <MapViewTracker onChange={setView} />

                        {canHover && <PointerTracker onPointer={pointAt} />}

                        {/* Resize handler to invalidate map on expand/collapse and fullscreen */}
                        <MapResizeHandler />

                        {/* Click handler */}
                        {onMapClick && <MapClickHandler onClick={onMapClick} />}

                        {/* Original resort marker - dimmed when custom location is active */}
                        <Marker
                            position={[lat, lon]}
                            opacity={hasCustomLocation ? 0.4 : 1}
                        >
                            <Popup>
                                <ResortPopupContent resortName={resortName} hasCustomLocation={hasCustomLocation} />
                            </Popup>
                        </Marker>

                        {/* Custom location marker */}
                        {hasCustomLocation && (
                            <Marker
                                position={[customLocation.lat, customLocation.lon]}
                                icon={customLocationIcon}
                            >
                                <Popup>
                                    <CustomLocationPopupContent
                                        lat={customLocation.lat}
                                        lon={customLocation.lon}
                                        elevationText={customElevationText}
                                        onText={customLocationOn}
                                    />
                                </Popup>
                            </Marker>
                        )}
                    </MapContainer>
                )}

                <div className="resort-map-controls">
                    {/* Switches between the flat map and the 3D map */}
                    {canShow3D && (
                        <button
                            type="button"
                            onClick={toggle3D}
                            className="resort-map-btn resort-map-btn-text"
                            aria-pressed={is3D}
                            title={is3D ? t('map.showFlat') : t('map.show3d')}
                        >
                            3D
                        </button>
                    )}

                    {/* Expand/collapse button (fullscreen has its own exit button) */}
                    {!isFullscreen && (
                        <button
                            type="button"
                            onClick={toggleExpanded}
                            className="resort-map-btn"
                            title={size === 'expanded' ? 'Collapse map' : 'Expand map'}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {size === 'expanded' ? (
                                    // Minimize icon
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                                ) : (
                                    // Maximize icon
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                )}
                            </svg>
                        </button>
                    )}

                    {/* Fullscreen button, offered once the map is expanded */}
                    {size !== 'small' && (
                        <button
                            type="button"
                            onClick={isFullscreen ? exitFullscreen : enterFullscreen}
                            className="resort-map-btn"
                            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isFullscreen ? (
                                    // Corners-in icon
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3.75V9H3.75M15 3.75V9h5.25M9 20.25V15H3.75M15 20.25V15h5.25" />
                                ) : (
                                    // Corners-out icon
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 9V3.75H9M15 3.75h5.25V9M3.75 15v5.25H9M15 20.25h5.25V15" />
                                )}
                            </svg>
                        </button>
                    )}

                    {/* Layers button: the Base map and Overlays, at every size of either map */}
                    <button
                        ref={layersButtonRef}
                        type="button"
                        onClick={() => setIsLayersPanelOpen(open => !open)}
                        className={`resort-map-btn ${isLayersPanelOpen ? 'active' : ''}`}
                        title="Map layers"
                        aria-expanded={isLayersPanelOpen}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {/* Stacked squares icon */}
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                        </svg>
                    </button>
                </div>

                {colouring && <MapLegend colouring={colouring} unitSystem={unitSystem} />}

                {reading && <CursorReadout reading={reading} unitSystem={unitSystem} is3D={is3D} />}

                {isLayersPanelOpen && (
                    <MapLayersPanel ref={layersPanelRef} layers={layers} onChange={setLayers} hints={hints} is3D={is3D} />
                )}
            </div>
        </div>
    );
}

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useFullscreenView } from '../../hooks/useFullscreenView';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import {
    DEFAULT_MAP_LAYERS,
    MAP_LAYERS_STORAGE_KEY,
    OSM_ATTRIBUTION,
    sanitizeMapLayers,
    type MapLayers,
    type OverlayId,
} from '../../utils/mapLayers';
import { difficultyConvention } from '../../utils/difficultyColours';
import { SKI_MAP_MIN_ZOOM } from '../../utils/skiMapData';
import { CONTOURS_MIN_ZOOM, SLOPE_ANGLE_MIN_ZOOM } from '../../utils/terrainRendering';
import type { UnitSystem } from '../../utils/unitConversion';
import { SatelliteBaseMap } from './SatelliteBaseMap';
import { TerrainOverlay } from './TerrainOverlay';
import { SkiMapOverlay, type SkiMapStatus } from './SkiMapOverlay';
import { MapLayersPanel } from './MapLayersPanel';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

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
    html: `<div style="
        width: 24px;
        height: 24px;
        background: #ef4444;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
});

// Marks the history entry pushed on entering fullscreen, so Back closes the map instead of leaving the page
const FULLSCREEN_HISTORY_KEY = 'resortMapFullscreen';

// Close enough for a typical Resort, a small hill of about 200 m vertical, to fill the map; big Resorts open cropped
const INITIAL_ZOOM = 14;

type MapSize = 'small' | 'expanded' | 'fullscreen';

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
}

// Reports the zoom whenever it changes, so the layers panel can say when an Overlay needs the map closer in
function ZoomTracker({ onZoom }: { onZoom: (zoom: number) => void }): null {
    const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
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

// A double-click or double-tap zooms the map, so a click only counts once no second one follows this soon
const DOUBLE_CLICK_MS = 300;

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
}: ResortMapProps): JSX.Element {
    const hasCustomLocation = customLocation !== null && customLocation !== undefined;
    const [isExpanded, setIsExpanded] = useState(false);
    // While fullscreen: Back and Esc close the map, and the page behind it can't scroll
    const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreenView(FULLSCREEN_HISTORY_KEY);
    // Fullscreen is only offered once expanded, so leaving it returns to the expanded map
    const size: MapSize = isFullscreen ? 'fullscreen' : isExpanded ? 'expanded' : 'small';

    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    // One Base map and any Overlays, the same on every map in this browser
    const [storedLayers, setStoredLayers] = useLocalStorage<unknown>(MAP_LAYERS_STORAGE_KEY, DEFAULT_MAP_LAYERS);
    const layers = useMemo(() => sanitizeMapLayers(storedLayers), [storedLayers]);
    const setLayers = useCallback((next: MapLayers) => setStoredLayers(next), [setStoredLayers]);
    const isOn = (overlay: OverlayId) => layers.overlays.includes(overlay);
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
        slopeAngle: zoom < SLOPE_ANGLE_MIN_ZOOM ? 'Zoom in to see slopes' : undefined,
    };

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

    return (
        // The outer box keeps the map's place in the page while the frame inside it goes fullscreen
        <div className={`resort-map-container ${size === 'small' ? '' : 'resort-map-expanded'}`}>
            <div className={`resort-map-frame ${isFullscreen ? 'resort-map-fullscreen' : ''}`}>
                <MapContainer
                    center={[lat, lon]}
                    zoom={INITIAL_ZOOM}
                    maxZoom={18}
                    scrollWheelZoom={true}
                    className={`h-full rounded-xl shadow-lg ${className}`}
                    style={{ zIndex: 0 }}
                >
                    {/* Standard is plain OpenStreetMap. OpenSkiMap looks better, but its terms forbid other sites using its tiles;
                        OpenSnowMap's ski run and lift overlay was tried and dropped for how it looked, so the Ski map draws its own. */}
                    {layers.baseMap === 'satellite' ? (
                        <SatelliteBaseMap />
                    ) : (
                        <TileLayer attribution={OSM_ATTRIBUTION} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    )}

                    {isOn('hillshade') && <TerrainOverlay kind="hillshade" unitSystem={unitSystem} onSatellite={layers.baseMap === 'satellite'} />}
                    {isOn('slopeAngle') && <TerrainOverlay kind="slopeAngle" unitSystem={unitSystem} onSatellite={layers.baseMap === 'satellite'} />}
                    {isOn('contours') && <TerrainOverlay kind="contours" unitSystem={unitSystem} onSatellite={layers.baseMap === 'satellite'} />}
                    {isOn('skiMap') && (
                        <SkiMapOverlay
                            convention={convention}
                            customLocation={customLocation}
                            onStatusChange={setSkiMapStatus}
                            onCustomLocationOnChange={setCustomLocationOn}
                        />
                    )}

                    <ZoomTracker onZoom={setZoom} />

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
                            {resortName}
                            {hasCustomLocation && <span className="text-xs text-gray-500"> (Original)</span>}
                        </Popup>
                    </Marker>

                    {/* Custom location marker */}
                    {hasCustomLocation && (
                        <Marker
                            position={[customLocation.lat, customLocation.lon]}
                            icon={customLocationIcon}
                        >
                            <Popup>
                                <div className="text-sm">
                                    <div className="font-semibold mb-1">Custom Location</div>
                                    <div className="text-gray-600">Lat: {customLocation.lat.toFixed(4)}</div>
                                    <div className="text-gray-600">Lon: {customLocation.lon.toFixed(4)}</div>
                                    {customElevationText === null || customElevationText === undefined ? (
                                        <div className="text-gray-500 italic mt-1">Loading elevation...</div>
                                    ) : (
                                        <div className="text-gray-600 mt-1">Elevation: {customElevationText}</div>
                                    )}
                                    {customLocationOn && <div className="text-gray-600 mt-1">{customLocationOn}</div>}
                                </div>
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>

                <div className="resort-map-controls">
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

                    {/* Layers button: the Base map and Overlays, at every size */}
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

                {isLayersPanelOpen && (
                    <MapLayersPanel ref={layersPanelRef} layers={layers} onChange={setLayers} hints={hints} />
                )}
            </div>
        </div>
    );
}

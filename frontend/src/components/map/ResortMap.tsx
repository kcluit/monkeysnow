import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useFullscreenView } from '../../hooks/useFullscreenView';
import { formatElevation, type UnitSystem } from '../../utils/unitConversion';
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

type MapSize = 'small' | 'expanded' | 'fullscreen';

interface ResortMapProps {
    lat: number;
    lon: number;
    resortName?: string;
    className?: string;
    // Custom location feature props
    onMapClick?: (lat: number, lon: number) => void;
    customLocation?: { lat: number; lon: number } | null;
    /** The Custom location's ground elevation in metres, or null until the forecast reports it */
    customElevation?: number | null;
    unitSystem: UnitSystem;
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
    useMapEvents({
        click: (e) => {
            onClick(e.latlng.lat, e.latlng.lng);
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
    customElevation,
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

    return (
        // The outer box keeps the map's place in the page while the frame inside it goes fullscreen
        <div className={`resort-map-container ${size === 'small' ? '' : 'resort-map-expanded'}`}>
            <div className={`resort-map-frame ${isFullscreen ? 'resort-map-fullscreen' : ''}`}>
                <MapContainer
                    center={[lat, lon]}
                    zoom={11}
                    maxZoom={18}
                    scrollWheelZoom={true}
                    className={`h-full rounded-xl shadow-lg ${className}`}
                    style={{ zIndex: 0 }}
                >
                    {/* Plain OpenStreetMap map. OpenSkiMap looks better, but its terms forbid other sites using its tiles;
                        OpenSnowMap's ski run and lift overlay was tried and dropped for how it looked. */}
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

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
                                    {customElevation === null || customElevation === undefined ? (
                                        <div className="text-gray-500 italic mt-1">Loading elevation...</div>
                                    ) : (
                                        <div className="text-gray-600 mt-1">Elevation: {formatElevation(customElevation, unitSystem)}</div>
                                    )}
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
                </div>
            </div>
        </div>
    );
}

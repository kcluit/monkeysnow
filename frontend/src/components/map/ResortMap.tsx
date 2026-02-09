import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

interface ResortMapProps {
    lat: number;
    lon: number;
    resortName?: string;
    className?: string;
    // Custom location feature props
    onMapClick?: (lat: number, lon: number) => void;
    customLocation?: { lat: number; lon: number } | null;
    customElevation?: number | null;
    isLoadingElevation?: boolean;
}

// Inner component to invalidate map size after resize
function MapResizeHandler({ isExpanded }: { isExpanded: boolean }): null {
    const map = useMap();
    useEffect(() => {
        // Invalidate size after CSS transition completes
        const timeout = setTimeout(() => map.invalidateSize(), 350);
        return () => clearTimeout(timeout);
    }, [map, isExpanded]);
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
    isLoadingElevation,
}: ResortMapProps): JSX.Element {
    const hasCustomLocation = customLocation !== null && customLocation !== undefined;
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    return (
        <div className="relative">
            <MapContainer
                center={[lat, lon]}
                zoom={11}
                scrollWheelZoom={true}
                className={`rounded-xl shadow-lg resort-map-container ${isExpanded ? 'resort-map-expanded' : ''} ${className}`}
                style={{ zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Resize handler to invalidate map on expand/collapse */}
                <MapResizeHandler isExpanded={isExpanded} />

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
                                {isLoadingElevation ? (
                                    <div className="text-gray-500 italic mt-1">Loading elevation...</div>
                                ) : customElevation !== null && customElevation !== undefined ? (
                                    <div className="text-gray-600 mt-1">Elevation: {customElevation}m</div>
                                ) : null}
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>

            {/* Expand/collapse button */}
            <button
                type="button"
                onClick={toggleExpanded}
                className="resort-map-expand-btn"
                title={isExpanded ? 'Collapse map' : 'Expand map'}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isExpanded ? (
                        // Minimize icon
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    ) : (
                        // Maximize icon
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    )}
                </svg>
            </button>
        </div>
    );
}

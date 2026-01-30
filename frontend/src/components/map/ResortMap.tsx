import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default marker icon issue with bundlers (Vite/Webpack)
// The default icons don't resolve correctly, so we use CDN URLs
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface ResortMapProps {
    lat: number;
    lon: number;
    resortName?: string;
    className?: string;
}

export function ResortMap({
    lat,
    lon,
    resortName,
    className = '',
}: ResortMapProps): JSX.Element {
    return (
        <MapContainer
            center={[lat, lon]}
            zoom={11}
            scrollWheelZoom={true}
            className={`h-[200px] rounded-xl shadow-lg ${className}`}
            style={{ zIndex: 0 }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[lat, lon]}>
                {resortName && <Popup>{resortName}</Popup>}
            </Marker>
        </MapContainer>
    );
}

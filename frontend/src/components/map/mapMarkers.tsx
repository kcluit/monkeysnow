/**
 * What the flat map and the 3D map both show at the Resort and the Custom location, so the two
 * look and behave the same (docs/adr/0008).
 */

// A double-click or double-tap zooms the map, so a click only counts once no second one follows this soon
export const DOUBLE_CLICK_MS = 300;

/** The red dot marking a Custom location, centred on it */
export const CUSTOM_LOCATION_DOT_SIZE = 24;
export const CUSTOM_LOCATION_DOT_HTML = `<div style="
        width: ${CUSTOM_LOCATION_DOT_SIZE}px;
        height: ${CUSTOM_LOCATION_DOT_SIZE}px;
        background: #ef4444;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>`;

export function ResortPopupContent({ resortName, hasCustomLocation }: {
    resortName?: string;
    hasCustomLocation: boolean;
}): JSX.Element {
    return (
        <>
            {resortName}
            {hasCustomLocation && <span className="text-xs text-gray-500"> (Original)</span>}
        </>
    );
}

export function CustomLocationPopupContent({ lat, lon, elevationText, onText }: {
    lat: number;
    lon: number;
    /** The height the Custom location is forecast at, or null until the forecast reports it */
    elevationText?: string | null;
    /** e.g. "On Peak to Creek, blue run" when the flat map's Ski map shows it on a Run or Lift */
    onText?: string | null;
}): JSX.Element {
    return (
        <div className="text-sm">
            <div className="font-semibold mb-1">Custom Location</div>
            <div className="text-gray-600">Lat: {lat.toFixed(4)}</div>
            <div className="text-gray-600">Lon: {lon.toFixed(4)}</div>
            {elevationText === null || elevationText === undefined ? (
                <div className="text-gray-500 italic mt-1">Loading elevation...</div>
            ) : (
                <div className="text-gray-600 mt-1">Elevation: {elevationText}</div>
            )}
            {onText && <div className="text-gray-600 mt-1">{onText}</div>}
        </div>
    );
}

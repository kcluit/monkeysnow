/**
 * The Satellite Base map's sources, for both maps: open national aerial photos where a country
 * publishes them, over EOX's Sentinel-2 mosaic everywhere else (docs/adr/0007). Esri's sharper
 * worldwide imagery wants an account, so it isn't used.
 */

/** [[south, west], [north, east]] */
export type Extent = [[number, number], [number, number]];

export interface ImagerySource {
    id: string;
    url: string;
    attribution: string;
    maxNativeZoom: number;
    /** Where it has photos; tiles outside are never asked for */
    extents: Extent[];
}

// 10 m per pixel: sharp enough at the zoom a whole Resort fits, blurry closer in
const EOX_YEAR = 2024;
export const EOX_URL = `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${EOX_YEAR}_3857/default/g/{z}/{y}/{x}.jpg`;
export const EOX_ATTRIBUTION = `<a href="https://cloudless.eox.at">EOxCloudless</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data ${EOX_YEAR})`;
export const EOX_MAX_NATIVE_ZOOM = 17;

// Zoomed out further, EOX is as sharp as a screen pixel and the national photos would only add requests
export const NATIONAL_MIN_ZOOM = 13;

// Later sources draw on top. Outside their country IGN, basemap.at, USGS and GSI return nothing, so the next one down
// shows through; swisstopo returns blurrier photos for a band beyond the border and white tiles further out, so it is
// fenced to rectangles hugging Switzerland and drawn under IGN and basemap.at, which cover its spill into France and Austria.
export const NATIONAL_SOURCES: ImagerySource[] = [
    {
        id: 'swisstopo',
        url: 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg',
        attribution: '&copy; <a href="https://www.swisstopo.admin.ch/">swisstopo</a>',
        maxNativeZoom: 19,
        extents: [
            [[46.13, 5.95], [46.95, 7.10]],
            [[46.95, 6.40], [47.55, 7.10]],
            [[45.92, 7.10], [47.62, 8.45]],
            [[45.81, 8.45], [47.82, 9.05]],
            [[46.15, 9.05], [47.70, 10.50]],
        ],
    },
    {
        id: 'gsi',
        url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">GSI Japan</a>',
        maxNativeZoom: 18,
        extents: [[[24.0, 122.9], [45.6, 146.0]]],
    },
    {
        id: 'usgs',
        url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
        attribution: '<a href="https://www.usgs.gov/programs/national-geospatial-program/national-map">USGS</a>',
        maxNativeZoom: 16,
        extents: [
            [[24.4, -124.9], [49.4, -66.9]], // Contiguous US
            [[51.2, -170.0], [71.5, -129.9]], // Alaska
        ],
    },
    {
        id: 'basemapAt',
        url: 'https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg',
        attribution: '<a href="https://basemap.at">basemap.at</a>',
        maxNativeZoom: 19,
        // Kept off the Engadin, South Tyrol and the Dolomites, which a single box around Austria would take in
        extents: [
            [[46.77, 9.53], [47.60, 11.30]], // Vorarlberg and western Tyrol
            [[46.65, 11.30], [47.80, 13.10]], // Eastern Tyrol and Salzburg
            [[46.37, 13.10], [49.02, 17.17]], // Carinthia, Styria and the east
        ],
    },
    {
        id: 'ign',
        url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
        attribution: '&copy; <a href="https://geoservices.ign.fr/">IGN</a>',
        maxNativeZoom: 19,
        // Kept off Switzerland and the Aosta valley, which a single box around France would take in
        extents: [
            [[42.3, -5.2], [51.1, 7.2]], // Mainland, up to the Alps
            [[47.4, 7.2], [49.1, 8.25]], // Alsace
            [[41.3, 8.5], [43.1, 9.6]], // Corsica
        ],
    },
];

/** Whether an extent overlaps a view given as south, west, north, east */
export function extentIntersects([[south, west], [north, east]]: Extent, view: { south: number; west: number; north: number; east: number }): boolean {
    return south <= view.north && north >= view.south && west <= view.east && east >= view.west;
}

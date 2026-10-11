import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { TERRAIN_ATTRIBUTION } from '../../utils/terrainTiles';
import {
    TERRAIN_OVERLAY_MIN_ZOOM,
    drawTerrainOverlayTile,
    terrainTileCanvas,
    type TerrainOverlayKind,
} from '../../utils/terrainOverlays';
import type { SlopeBand } from '../../utils/slopeBands';
import type { UnitSystem } from '../../utils/unitConversion';

type DrawTile = (canvas: HTMLCanvasElement, coords: L.Coords) => Promise<void>;

/** A Leaflet tile layer whose tiles are canvases drawn in the browser rather than images fetched whole. */
class CanvasTileLayer extends L.GridLayer {
    private readonly drawTile: DrawTile;

    constructor(drawTile: DrawTile, options: L.GridLayerOptions) {
        super(options);
        this.drawTile = drawTile;
    }

    protected createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
        const canvas = terrainTileCanvas();
        this.drawTile(canvas, coords).then(
            () => done(undefined, canvas),
            (error: Error) => done(error, canvas),
        );
        return canvas;
    }
}

// Over the Base map's tiles: the shading, then a Terrain colouring, Flats over that, and contours on top
const Z_INDEX: Record<TerrainOverlayKind, number> = {
    hillshade: 10,
    slopeAngle: 11,
    gradient: 11,
    aspect: 11,
    heightTint: 11,
    flats: 12,
    contours: 13,
};

interface TerrainOverlayProps {
    kind: TerrainOverlayKind;
    unitSystem: UnitSystem;
    onSatellite: boolean;
    /** Only Slope angle needs them; the tiles are drawn again when they change */
    slopeBands?: readonly SlopeBand[];
}

/** One terrain Overlay on the flat map, drawn from Mapterhorn's terrain (docs/adr/0009). */
export function TerrainOverlay({ kind, unitSystem, onSatellite, slopeBands }: TerrainOverlayProps): null {
    const map = useMap();

    useEffect(() => {
        const layer = new CanvasTileLayer(
            (canvas, { x, y, z }) => drawTerrainOverlayTile(kind, canvas, z, x, y, { unitSystem, onSatellite, slopeBands }),
            {
                attribution: TERRAIN_ATTRIBUTION,
                minZoom: TERRAIN_OVERLAY_MIN_ZOOM[kind],
                zIndex: Z_INDEX[kind],
                updateWhenZooming: false,
            },
        );
        layer.addTo(map);
        return () => {
            layer.remove();
        };
    }, [map, kind, unitSystem, onSatellite, slopeBands]);

    return null;
}

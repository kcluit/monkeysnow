import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { elevationWindow, TERRAIN_ATTRIBUTION } from '../../utils/terrainTiles';
import {
    CONTOURS_MIN_ZOOM,
    SLOPE_ANGLE_MIN_ZOOM,
    TERRAIN_BORDER,
    renderContours,
    renderHillshade,
    renderSlopeAngle,
    type ContourStyle,
} from '../../utils/terrainRendering';
import type { UnitSystem } from '../../utils/unitConversion';

export type TerrainOverlayKind = 'hillshade' | 'slopeAngle' | 'contours';

type DrawTile = (canvas: HTMLCanvasElement, coords: L.Coords) => Promise<void>;

/** A Leaflet tile layer whose tiles are canvases drawn in the browser rather than images fetched whole. */
class CanvasTileLayer extends L.GridLayer {
    private readonly drawTile: DrawTile;

    constructor(drawTile: DrawTile, options: L.GridLayerOptions) {
        super(options);
        this.drawTile = drawTile;
    }

    protected createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
        const canvas = document.createElement('canvas');
        const size = this.getTileSize();
        // Drawn at the screen's resolution, so lines and labels stay sharp on high-DPI screens
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = size.x * ratio;
        canvas.height = size.y * ratio;
        this.drawTile(canvas, coords).then(
            () => done(undefined, canvas),
            (error: Error) => done(error, canvas),
        );
        return canvas;
    }
}

// Brown like a paper topo map on Standard; white over the darker Satellite photos
const CONTOUR_STYLES: Record<'standard' | 'satellite', ContourStyle> = {
    standard: { line: 'rgba(140, 90, 40, 0.5)', indexLine: 'rgba(140, 90, 40, 0.8)', label: 'rgb(120, 75, 30)', halo: 'rgba(255, 255, 255, 0.85)' },
    satellite: { line: 'rgba(255, 255, 255, 0.5)', indexLine: 'rgba(255, 255, 255, 0.85)', label: 'rgb(255, 255, 255)', halo: 'rgba(0, 0, 0, 0.6)' },
};

interface TerrainOverlayProps {
    kind: TerrainOverlayKind;
    unitSystem: UnitSystem;
    onSatellite: boolean;
}

/** The contour, hillshade or slope angle Overlay, drawn from AWS Terrain Tiles. */
export function TerrainOverlay({ kind, unitSystem, onSatellite }: TerrainOverlayProps): null {
    const map = useMap();

    useEffect(() => {
        const draw: DrawTile = async (canvas, { x, y, z }) => {
            const heights = await elevationWindow(z, x, y, TERRAIN_BORDER);
            if (!heights) return;
            if (kind === 'hillshade') renderHillshade(canvas, heights);
            else if (kind === 'slopeAngle') renderSlopeAngle(canvas, heights);
            else renderContours(canvas, heights, z, unitSystem, CONTOUR_STYLES[onSatellite ? 'satellite' : 'standard']);
        };
        const layer = new CanvasTileLayer(draw, {
            attribution: TERRAIN_ATTRIBUTION,
            minZoom: kind === 'contours' ? CONTOURS_MIN_ZOOM : kind === 'slopeAngle' ? SLOPE_ANGLE_MIN_ZOOM : 0,
            // Over the Base map's tiles, with contours on top of the shading
            zIndex: kind === 'hillshade' ? 10 : kind === 'slopeAngle' ? 11 : 12,
            updateWhenZooming: false,
        });
        layer.addTo(map);
        return () => {
            layer.remove();
        };
    }, [map, kind, unitSystem, onSatellite]);

    return null;
}

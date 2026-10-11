/**
 * Draws one 256 px tile of a terrain Overlay, from Mapterhorn's heights, for either map: the flat
 * map's canvas tiles and the 3D map's draped raster tiles come from the same drawing (docs/adr/0009).
 */

import { elevationWindow } from './terrainTiles';
import {
    CONTOURS_MIN_ZOOM,
    STEEPNESS_MIN_ZOOM,
    TERRAIN_BORDER,
    renderAspect,
    renderContours,
    renderFlats,
    renderGradient,
    renderHeightTint,
    renderHillshade,
    renderSlopeAngle,
    type ContourStyle,
} from './terrainRendering';
import type { UnitSystem } from './unitConversion';

export type TerrainOverlayKind = 'hillshade' | 'contours' | 'flats' | 'slopeAngle' | 'gradient' | 'aspect' | 'heightTint';

export const TERRAIN_OVERLAY_KINDS: readonly TerrainOverlayKind[] = ['hillshade', 'contours', 'flats', 'slopeAngle', 'gradient', 'aspect', 'heightTint'];

/** The closest-out zoom each is drawn at: whatever depends on steepness needs terrain about 30 m or finer */
export const TERRAIN_OVERLAY_MIN_ZOOM: Record<TerrainOverlayKind, number> = {
    hillshade: 0,
    contours: CONTOURS_MIN_ZOOM,
    flats: STEEPNESS_MIN_ZOOM,
    slopeAngle: STEEPNESS_MIN_ZOOM,
    gradient: STEEPNESS_MIN_ZOOM,
    aspect: STEEPNESS_MIN_ZOOM,
    heightTint: 0,
};

// Brown like a paper topo map on Standard; white over the darker Satellite photos
const CONTOUR_STYLES: Record<'standard' | 'satellite', ContourStyle> = {
    standard: { line: 'rgba(140, 90, 40, 0.5)', indexLine: 'rgba(140, 90, 40, 0.8)', label: 'rgb(120, 75, 30)', halo: 'rgba(255, 255, 255, 0.85)' },
    satellite: { line: 'rgba(255, 255, 255, 0.5)', indexLine: 'rgba(255, 255, 255, 0.85)', label: 'rgb(255, 255, 255)', halo: 'rgba(0, 0, 0, 0.6)' },
};

export interface TerrainOverlayOptions {
    unitSystem: UnitSystem;
    onSatellite: boolean;
}

/** A canvas for one 256 px tile, at the screen's resolution so lines and labels stay sharp on high-DPI screens */
export function terrainTileCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 256 * ratio;
    canvas.height = 256 * ratio;
    return canvas;
}

/** Draws map tile z/x/y of one terrain Overlay onto the canvas, leaving it clear if the heights couldn't be had. */
export async function drawTerrainOverlayTile(
    kind: TerrainOverlayKind,
    canvas: HTMLCanvasElement,
    z: number,
    x: number,
    y: number,
    { unitSystem, onSatellite }: TerrainOverlayOptions,
): Promise<void> {
    const heights = await elevationWindow(z, x, y, TERRAIN_BORDER);
    if (!heights) return;
    switch (kind) {
        case 'hillshade': return renderHillshade(canvas, heights);
        case 'contours': return renderContours(canvas, heights, z, unitSystem, CONTOUR_STYLES[onSatellite ? 'satellite' : 'standard']);
        case 'flats': return renderFlats(canvas, heights);
        case 'slopeAngle': return renderSlopeAngle(canvas, heights);
        case 'gradient': return renderGradient(canvas, heights);
        case 'aspect': return renderAspect(canvas, heights);
        case 'heightTint': return renderHeightTint(canvas, heights);
    }
}

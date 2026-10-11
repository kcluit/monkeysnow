import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import {
    fetchSquares,
    readSquares,
    squaresCovering,
    MAX_SQUARES_PER_QUERY,
    SKI_MAP_MIN_ZOOM,
    type RunKind,
    type SkiMapFeature,
} from '../../utils/skiMapData';
import { difficultyColour, type DifficultyConvention } from '../../utils/difficultyColours';
import { OSM_ATTRIBUTION } from '../../utils/mapLayers';

/** What the Ski map's row in the layers panel says about it. */
export type SkiMapStatus = 'zoomIn' | 'loading' | 'ready' | 'unavailable';

const OTHER_RUNS: Record<Exclude<RunKind, 'downhill'>, { colour: string; dashArray?: string; name: string }> = {
    nordic: { colour: '#0d9488', dashArray: '8 5', name: 'nordic trail' },
    skitour: { colour: '#c026d3', dashArray: '1 6', name: 'touring route' },
    snow_park: { colour: '#db2777', name: 'terrain park' },
    sled: { colour: '#a16207', dashArray: '4 4', name: 'sled run' },
};

const LIFT_NAMES: Record<string, string> = {
    cable_car: 'cable car',
    gondola: 'gondola',
    mixed_lift: 'chair-gondola',
    chair_lift: 'chairlift',
    drag_lift: 'drag lift',
    't-bar': 'T-bar',
    'j-bar': 'J-bar',
    platter: 'platter lift',
    rope_tow: 'rope tow',
    magic_carpet: 'magic carpet',
};

const LIFT_COLOUR = '#1f2937';

/** What kind of Run or Lift it is, as a skier would say, e.g. "blue run" or "chairlift". */
function kindName(feature: SkiMapFeature, convention: DifficultyConvention): string {
    if (feature.kind === 'lift') return LIFT_NAMES[feature.liftType ?? ''] ?? 'lift';
    if (feature.kind === 'downhill') return `${difficultyColour(feature.difficulty, convention).name} run`;
    return OTHER_RUNS[feature.kind].name;
}

const withArticle = (phrase: string) => (/^[aeiou]/i.test(phrase) ? `an ${phrase}` : `a ${phrase}`);

/** e.g. "On Peak to Creek, blue run", or "On a chairlift" for one with no name. */
export function describeCustomLocationOn(feature: SkiMapFeature, convention: DifficultyConvention): string {
    const kind = kindName(feature, convention);
    return feature.name ? `On ${feature.name}, ${kind}` : `On ${withArticle(kind)}`;
}

// Areas under Runs, white casings under coloured lines, then Lifts over everything; all under the markers (600).
// Only the top canvas gets the mouse, so names on hover come from invisible lines in a pane of their own.
const PANES = [
    { name: 'skiMapAreas', zIndex: 405 },
    { name: 'skiMapCasings', zIndex: 410 },
    { name: 'skiMapRuns', zIndex: 420 },
    { name: 'skiMapLifts', zIndex: 430 },
    { name: 'skiMapHover', zIndex: 440 },
] as const;

type Renderers = Record<(typeof PANES)[number]['name'], L.Canvas>;

/** The Leaflet layers that draw one Run or Lift. */
function featureLayers(feature: SkiMapFeature, convention: DifficultyConvention, renderers: Renderers): L.Path[] {
    const latlngs = feature.coords;
    if (feature.kind === 'lift') {
        return [
            L.polyline(latlngs, { renderer: renderers.skiMapLifts, color: '#ffffff', weight: 4.5, opacity: 0.8, interactive: false }),
            L.polyline(latlngs, { renderer: renderers.skiMapLifts, color: LIFT_COLOUR, weight: 2, interactive: false }),
            // Short bars across the line, like the pylons on a trail map
            L.polyline(latlngs, { renderer: renderers.skiMapLifts, color: LIFT_COLOUR, weight: 7, dashArray: '1.5 16', lineCap: 'butt', interactive: false }),
        ];
    }

    const difficulty = feature.kind === 'downhill' ? difficultyColour(feature.difficulty, convention) : null;
    const colour = difficulty ? difficulty.colour : OTHER_RUNS[feature.kind as Exclude<RunKind, 'downhill'>].colour;
    const dashArray = difficulty ? (difficulty.dashed ? '6 5' : undefined) : OTHER_RUNS[feature.kind as Exclude<RunKind, 'downhill'>].dashArray;

    if (feature.area) {
        return [L.polygon(latlngs, {
            renderer: renderers.skiMapAreas, color: colour, weight: 1, opacity: 0.5, fillColor: colour, fillOpacity: 0.15, interactive: false,
        })];
    }
    return [
        L.polyline(latlngs, { renderer: renderers.skiMapCasings, color: '#ffffff', weight: 5, opacity: 0.6, interactive: false }),
        L.polyline(latlngs, { renderer: renderers.skiMapRuns, color: colour, weight: difficulty ? 3 : 2.5, dashArray, interactive: false }),
    ];
}

/** An invisible copy of a Run or Lift, a little wider, that shows its name while the mouse is over it. */
function hoverLayer(feature: SkiMapFeature, convention: DifficultyConvention, renderers: Renderers): L.Path {
    const options: L.PolylineOptions = { renderer: renderers.skiMapHover, weight: 10, opacity: 0, fillOpacity: 0, interactive: true };
    const layer = feature.area ? L.polygon(feature.coords, options) : L.polyline(feature.coords, options);
    const kind = kindName(feature, convention);
    return layer.bindTooltip(feature.name ? `${feature.name} (${kind})` : kind, { sticky: true, direction: 'top', offset: [0, -8] });
}

function distanceToSegment(p: L.Point, a: L.Point, b: L.Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function insidePolygon(p: L.Point, points: L.Point[]): boolean {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i];
        const b = points[j];
        if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
}

// A tap this close to a line counts as on it
const ON_TOLERANCE_PX = 10;

/** The Run or Lift drawn nearest a point, if one is within a finger's width of it on screen. */
function featureAt(map: L.Map, lat: number, lon: number, features: Iterable<SkiMapFeature>): SkiMapFeature | null {
    const point = map.latLngToLayerPoint([lat, lon]);
    let nearest: SkiMapFeature | null = null;
    let nearestDistance = ON_TOLERANCE_PX;
    for (const feature of features) {
        const points = feature.coords.map(c => map.latLngToLayerPoint(c));
        let distance = Infinity;
        for (let i = 1; i < points.length; i++) distance = Math.min(distance, distanceToSegment(point, points[i - 1], points[i]));
        // Inside a mapped area counts, but any line close by wins over it
        if (feature.area && insidePolygon(point, points)) distance = Math.min(distance, ON_TOLERANCE_PX - 0.01);
        // Where a Lift crosses a Run, the Lift is drawn on top, so it wins, as it does on hover
        if (feature.kind === 'lift') distance -= 2;
        if (distance < nearestDistance) {
            nearest = feature;
            nearestDistance = distance;
        }
    }
    return nearest;
}

interface SkiMapOverlayProps {
    /** How downhill Runs are coloured: the convention of the Resort's country */
    convention: DifficultyConvention;
    customLocation: { lat: number; lon: number } | null | undefined;
    onStatusChange: (status: SkiMapStatus) => void;
    /** What the Custom location is on, e.g. "On Peak to Creek, blue run", or null */
    onCustomLocationOnChange: (text: string | null) => void;
}

/**
 * The Ski map: every Run and Lift in view, fetched from OpenStreetMap as the map moves.
 * Names show on hover where there is a mouse; on touch screens a tap always picks a
 * Custom location, whose popup then says what it is on.
 */
export function SkiMapOverlay({ convention, customLocation, onStatusChange, onCustomLocationOnChange }: SkiMapOverlayProps): null {
    const map = useMap();
    const [features, setFeatures] = useState<ReadonlyMap<string, SkiMapFeature>>(() => new Map());

    const onStatusChangeRef = useRef(onStatusChange);
    const onCustomLocationOnChangeRef = useRef(onCustomLocationOnChange);
    useLayoutEffect(() => {
        onStatusChangeRef.current = onStatusChange;
        onCustomLocationOnChangeRef.current = onCustomLocationOnChange;
    });

    useEffect(() => {
        for (const { name, zIndex } of PANES) {
            if (!map.getPane(name)) map.createPane(name).style.zIndex = String(zIndex);
        }
        const renderers = Object.fromEntries(PANES.map(({ name }) => [name, L.canvas({ pane: name, tolerance: 4 })])) as Renderers;
        const group = L.layerGroup().addTo(map);
        // Touch screens have no hover, and a tap must stay free to pick a Custom location
        const canHover = window.matchMedia('(hover: hover)').matches;
        const drawn = new Map<string, SkiMapFeature>();
        const controller = new AbortController();
        map.attributionControl?.addAttribution(OSM_ATTRIBUTION);

        // Where a Lift crosses a Run, hovering names the Lift, which is drawn on top
        const liftHoverLayers: L.Path[] = [];

        const draw = (list: SkiMapFeature[]) => {
            let added = false;
            for (const feature of list) {
                if (drawn.has(feature.id)) continue;
                drawn.set(feature.id, feature);
                featureLayers(feature, convention, renderers).forEach(layer => group.addLayer(layer));
                if (canHover) {
                    const hover = hoverLayer(feature, convention, renderers);
                    group.addLayer(hover);
                    if (feature.kind === 'lift') liftHoverLayers.push(hover);
                }
                added = true;
            }
            if (!added) return;
            liftHoverLayers.forEach(layer => layer.bringToFront());
            setFeatures(new Map(drawn));
        };

        const report = (status: SkiMapStatus) => onStatusChangeRef.current(status);
        let running = false;
        let runAgain = false;
        let failures = 0;
        let retryAt = 0;
        let retryTimer: number | undefined;

        const update = async (): Promise<void> => {
            if (running) {
                runAgain = true;
                return;
            }
            if (map.getZoom() < SKI_MAP_MIN_ZOOM) {
                report('zoomIn');
                return;
            }
            running = true;
            try {
                const view = map.getBounds();
                const { features: known, needed } = await readSquares(
                    squaresCovering(view.getSouth(), view.getWest(), view.getNorth(), view.getEast())
                );
                if (controller.signal.aborted) return;
                draw(known);
                if (needed.length === 0) {
                    report('ready');
                    return;
                }
                // Overpass just failed: show what's known, and wait for the retry rather than asking again on every pan
                if (Date.now() < retryAt) {
                    report('unavailable');
                    return;
                }
                report('loading');
                draw(await fetchSquares(needed.slice(0, MAX_SQUARES_PER_QUERY), controller.signal));
                failures = 0;
                if (needed.length > MAX_SQUARES_PER_QUERY) runAgain = true;
                else report('ready');
            } catch {
                if (controller.signal.aborted) return;
                // 30 s, then doubling up to 5 minutes
                failures++;
                const delay = Math.min(300_000, 30_000 * 2 ** (failures - 1));
                retryAt = Date.now() + delay;
                report('unavailable');
                window.clearTimeout(retryTimer);
                retryTimer = window.setTimeout(() => void update(), delay);
            } finally {
                running = false;
                if (runAgain && !controller.signal.aborted) {
                    runAgain = false;
                    void update();
                }
            }
        };

        const onMoveEnd = () => void update();
        map.on('moveend', onMoveEnd);
        void update();

        return () => {
            controller.abort();
            window.clearTimeout(retryTimer);
            map.off('moveend', onMoveEnd);
            group.remove();
            Object.values(renderers).forEach(renderer => renderer.remove());
            map.attributionControl?.removeAttribution(OSM_ATTRIBUTION);
            setFeatures(new Map());
        };
    }, [map, convention]);

    // Measured on screen at the current zoom, when the Custom location is picked and again as more Runs arrive
    useEffect(() => {
        const feature = customLocation ? featureAt(map, customLocation.lat, customLocation.lon, features.values()) : null;
        onCustomLocationOnChangeRef.current(feature ? describeCustomLocationOn(feature, convention) : null);
    }, [map, customLocation, features, convention]);

    // Turned off: the Custom location is no longer said to be on anything
    useEffect(() => () => onCustomLocationOnChangeRef.current(null), []);

    return null;
}

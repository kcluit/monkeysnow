/**
 * What the flat map's and the 3D map's Ski maps share: how each kind of Run and Lift is drawn and
 * named, what a Custom location is on, and keeping the Runs and Lifts in view loaded as the map moves.
 */

import {
    fetchSquare,
    readSquares,
    squaresCovering,
    SKI_MAP_MIN_ZOOM,
    type RunKind,
    type SkiMapFeature,
} from '../../utils/skiMapData';
import { difficultyColour, type DifficultyConvention } from '../../utils/difficultyColours';

/** What the Ski map's row in the layers panel says about it. */
export type SkiMapStatus = 'zoomIn' | 'loading' | 'ready' | 'unavailable';

/** The Runs that aren't downhill, with their colour and dashes in pixels as the flat map draws them */
export const OTHER_RUNS: Record<Exclude<RunKind, 'downhill'>, { colour: string; dashArray?: string; name: string }> = {
    nordic: { colour: '#0d9488', dashArray: '8 5', name: 'nordic trail' },
    skitour: { colour: '#c026d3', dashArray: '1 6', name: 'touring route' },
    snow_park: { colour: '#db2777', name: 'terrain park' },
    sled: { colour: '#a16207', dashArray: '4 4', name: 'sled run' },
};

/** A downhill Run's dashes, for the off-piste and freeride routes European trail maps dash */
export const DASHED_DOWNHILL = '6 5';

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
    funicular: 'funicular',
    railway: 'mountain railway',
};

export const LIFT_COLOUR = '#1f2937';

/** How a Run is drawn: its colour, its dashes in pixels if any, and whether it is a downhill Run */
export function runStyle(feature: SkiMapFeature, convention: DifficultyConvention): { colour: string; dashArray?: string; downhill: boolean } {
    if (feature.kind === 'downhill') {
        const difficulty = difficultyColour(feature.difficulty, convention);
        return { colour: difficulty.colour, dashArray: difficulty.dashed ? DASHED_DOWNHILL : undefined, downhill: true };
    }
    const other = OTHER_RUNS[feature.kind as Exclude<RunKind, 'downhill'>];
    return { colour: other.colour, dashArray: other.dashArray, downhill: false };
}

/** What kind of Run or Lift it is, as a skier would say, e.g. "blue run" or "chairlift". */
export function kindName(feature: SkiMapFeature, convention: DifficultyConvention): string {
    if (feature.kind === 'lift') return LIFT_NAMES[feature.liftType ?? ''] ?? 'lift';
    if (feature.kind === 'downhill') return `${difficultyColour(feature.difficulty, convention).name} run`;
    return OTHER_RUNS[feature.kind].name;
}

/** What hovering over a Run or Lift says, e.g. "Peak to Creek (blue run)" */
export function hoverName(feature: SkiMapFeature, convention: DifficultyConvention): string {
    const kind = kindName(feature, convention);
    return feature.name ? `${feature.name} (${kind})` : kind;
}

const withArticle = (phrase: string) => (/^[aeiou]/i.test(phrase) ? `an ${phrase}` : `a ${phrase}`);

/** e.g. "On Peak to Creek, blue run", or "On a chairlift" for one with no name. */
export function describeCustomLocationOn(feature: SkiMapFeature, convention: DifficultyConvention): string {
    const kind = kindName(feature, convention);
    return feature.name ? `On ${feature.name}, ${kind}` : `On ${withArticle(kind)}`;
}

interface ScreenPoint {
    x: number;
    y: number;
}

function distanceToSegment(p: ScreenPoint, a: ScreenPoint, b: ScreenPoint): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function insidePolygon(p: ScreenPoint, points: ScreenPoint[]): boolean {
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
export function featureAt(
    toScreen: (lat: number, lon: number) => ScreenPoint,
    lat: number,
    lon: number,
    features: Iterable<SkiMapFeature>,
): SkiMapFeature | null {
    const point = toScreen(lat, lon);
    let nearest: SkiMapFeature | null = null;
    let nearestDistance = ON_TOLERANCE_PX;
    for (const feature of features) {
        const points = feature.coords.map(([featureLat, featureLon]) => toScreen(featureLat, featureLon));
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

/** Where a map is looking: its zoom, in the flat map's levels, and the ground to load Runs and Lifts for */
export interface SkiMapView {
    zoom: number;
    south: number;
    west: number;
    north: number;
    east: number;
}

/**
 * Loads the Runs and Lifts of the view, from IndexedDB and then the site's square files, and again
 * whenever `update` is called as the map moves. A square failing to load, as when offline, backs off
 * from 30 s to 5 minutes.
 */
export function startSkiMapLoader({ view, onFeatures, onStatus }: {
    view: () => SkiMapView;
    /** Runs and Lifts as they arrive, including ones already reported */
    onFeatures: (features: SkiMapFeature[]) => void;
    onStatus: (status: SkiMapStatus) => void;
}): { update: () => void; stop: () => void } {
    const controller = new AbortController();
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
        const { zoom, south, west, north, east } = view();
        if (zoom < SKI_MAP_MIN_ZOOM) {
            onStatus('zoomIn');
            return;
        }
        running = true;
        try {
            const { features: known, needed } = await readSquares(squaresCovering(south, west, north, east));
            if (controller.signal.aborted) return;
            onFeatures(known);
            if (needed.length === 0) {
                onStatus('ready');
                return;
            }
            // A square just failed: show what's known, and wait for the retry rather than asking again on every pan
            if (Date.now() < retryAt) {
                onStatus('unavailable');
                return;
            }
            onStatus('loading');
            const fetched = await Promise.allSettled(needed.map(square => fetchSquare(square, controller.signal)));
            if (controller.signal.aborted) return;
            // Drawn together, so the 3D map redraws once rather than once a square
            onFeatures(fetched.flatMap(result => (result.status === 'fulfilled' ? result.value : [])));
            const failed = fetched.find(result => result.status === 'rejected');
            if (failed) throw failed.reason;
            failures = 0;
            onStatus('ready');
        } catch {
            if (controller.signal.aborted) return;
            // 30 s, then doubling up to 5 minutes
            failures++;
            const delay = Math.min(300_000, 30_000 * 2 ** (failures - 1));
            retryAt = Date.now() + delay;
            onStatus('unavailable');
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

    void update();
    return {
        update: () => void update(),
        stop: () => {
            controller.abort();
            window.clearTimeout(retryTimer);
        },
    };
}
